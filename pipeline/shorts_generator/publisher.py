"""
Publicação automática em redes sociais.
Suporta: YouTube Shorts, TikTok, Instagram Reels.
"""
import os
import json
import requests
from .config import BEEHIVE_API_URL


class Publisher:
    """Publica clips nas redes sociais conectadas do agent."""

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.social_accounts = self._load_social_accounts()

    def _load_social_accounts(self) -> list:
        """Carrega redes sociais conectadas do agent via API."""
        try:
            resp = requests.get(
                f"{BEEHIVE_API_URL}/api/shorts/agents/{self.agent_id}/social",
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return []

    def publish_all(self, clip_data: dict) -> list:
        """
        Publica o clip em todas as redes conectadas.

        Args:
            clip_data: {
                "clip_path": str,
                "title": str,
                "description": str,
                "hashtags": [str],
                "clip_id": str,
            }

        Returns:
            Lista de resultados por plataforma.
        """
        results = []
        caption = self._build_caption(clip_data["title"], clip_data["description"], clip_data["hashtags"])

        for account in self.social_accounts:
            if not account.get("active"):
                continue

            platform = account["platform"]

            try:
                if platform == "youtube":
                    result = self._publish_youtube(account, clip_data, caption)
                elif platform == "tiktok":
                    result = self._publish_tiktok(account, clip_data, caption)
                elif platform == "instagram":
                    result = self._publish.instagram(account, clip_data, caption)
                else:
                    result = {"success": False, "error": f"Plataforma não suportada: {platform}"}

                result["platform"] = platform
                results.append(result)

            except Exception as e:
                results.append({
                    "platform": platform,
                    "success": False,
                    "error": str(e),
                })

        return results

    def _publish_youtube(self, account: dict, clip_data: dict, caption: str) -> dict:
        """Publica no YouTube Shorts via Data API v3."""
        access_token = account.get("accessToken", "")
        if not access_token:
            return {"success": False, "error": "Access token não configurado"}

        try:
            import googleapiclient.discovery
            from googleapiclient.http import MediaFileUpload

            youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=access_token)

            body = {
                "snippet": {
                    "title": clip_data["title"][:100],
                    "description": caption,
                    "tags": clip_data.get("hashtags", []),
                    "categoryId": "22",
                },
                "status": {
                    "privacyStatus": "public",
                    "selfDeclaredMadeForKids": False,
                },
            }

            media = MediaFileUpload(
                clip_data["clip_path"],
                mimetype="video/mp4",
                resumable=True,
            )

            request = youtube.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media,
            )

            response = request.execute()

            return {
                "success": True,
                "externalPostId": response.get("id", ""),
                "url": f"https://youtube.com/shorts/{response.get('id', '')}",
            }

        except ImportError:
            return {"success": False, "error": "google-api-python-client não instalado"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _publish_tiktok(self, account: dict, clip_data: dict, caption: str) -> dict:
        """Publica no TikTok via Content Posting API."""
        access_token = account.get("accessToken", "")
        if not access_token:
            return {"success": False, "error": "Access token não configurado"}

        try:
            with open(clip_data["clip_path"], "rb") as f:
                video_data = f.read()

            init_resp = requests.post(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                headers={"Authorization": f"Bearer {access_token}"},
                data={
                    "post_info": json.dumps({
                        "title": clip_data["title"][:150],
                        "privacy_level": "PUBLIC_TO_EVERYONE",
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False,
                    }),
                    "source_info": "FILE_UPLOAD",
                    "video_size": str(len(video_data)),
                },
                timeout=30,
            )

            if init_resp.status_code != 200:
                return {"success": False, "error": f"Init failed: {init_resp.text[:200]}"}

            init_data = init_resp.json().get("data", {})
            upload_url = init_data.get("upload_url", "")
            publish_id = init_data.get("publish_id", "")

            if upload_url:
                upload_resp = requests.put(
                    upload_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "video/mp4",
                    },
                    data=video_data,
                    timeout=300,
                )

                if upload_resp.status_code in (200, 201):
                    return {
                        "success": True,
                        "externalPostId": publish_id,
                        "url": f"https://tiktok.com/@{account.get('accountName', '')}/video/{publish_id}",
                    }

            return {"success": False, "error": "Upload failed"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _publish_instagram(self, account: dict, clip_data: dict, caption: str) -> dict:
        """Publica no Instagram Reels via Graph API."""
        access_token = account.get("accessToken", "")
        if not access_token:
            return {"success": False, "error": "Access token não configurado"}

        try:
            container_resp = requests.post(
                f"https://graph.facebook.com/v18.0/me/media",
                data={
                    "media_type": "REELS",
                    "video_url": clip_data.get("clip_url", ""),
                    "caption": caption,
                    "access_token": access_token,
                },
                timeout=30,
            )

            if container_resp.status_code != 200:
                return {"success": False, "error": f"Container creation failed: {container_resp.text[:200]}"}

            container_id = container_resp.json().get("id", "")

            import time
            for _ in range(30):
                status_resp = requests.get(
                    f"https://graph.facebook.com/v18.0/{container_id}",
                    params={"fields": "status_code", "access_token": access_token},
                    timeout=10,
                )
                status = status_resp.json().get("status_code", "")
                if status == "FINISHED":
                    publish_resp = requests.post(
                        f"https://graph.facebook.com/v18.0/me/media_publish",
                        data={
                            "creation_id": container_id,
                            "access_token": access_token,
                        },
                        timeout=30,
                    )
                    post_id = publish_resp.json().get("id", "")
                    return {
                        "success": True,
                        "externalPostId": post_id,
                        "url": f"https://instagram.com/reel/{post_id}",
                    }
                elif status == "ERROR":
                    return {"success": False, "error": "Processing failed on Instagram"}
                time.sleep(5)

            return {"success": False, "error": "Timeout waiting for processing"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _build_caption(self, title: str, description: str, hashtags: list) -> str:
        """Constrói caption completa com hashtags."""
        parts = []
        if title:
            parts.append(title)
        if description:
            parts.append(description)
        if hashtags:
            tag_str = " ".join(f"#{t}" for t in hashtags[:15])
            parts.append(tag_str)
        return "\n\n".join(parts)
