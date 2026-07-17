import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';

import Home from '../pages/home/HomePage';
import ChatPage from '../pages/chat/ChatPage';
import ProjectsPage from '../pages/projetos/ProjectsPage';
import ProjectDetailPage from '../pages/projetos/ProjectDetailPage';
import NegociosPage from '../pages/negocios/NegociosPage';
import AgentsPage from '../pages/business/AgentsPage';
import SkillsPage from '../pages/business/SkillsPage';
import WorkflowsPage from '../pages/business/WorkflowsPage';
import MemoryPage from '../pages/business/MemoryPage';
import BrowserPage from '../pages/business/BrowserPage';
import ArtifactsPage from '../pages/business/ArtifactsPage';
import KnowledgePage from '../pages/business/KnowledgePage';
import AnalyticsPage from '../pages/business/AnalyticsPage';
import CodingPage from '../pages/business/CodingPage';
import ImagePage from '../pages/business/ImagePage';
import VideoPage from '../pages/business/VideoPage';
import AudioPage from '../pages/business/AudioPage';
import InstagramPage from '../pages/business/InstagramPage';
import TikTokPage from '../pages/business/TikTokPage';
import YouTubePage from '../pages/business/YouTubePage';
import FinancePage from '../pages/business/FinancePage';
import MarketingPage from '../pages/business/MarketingPage';
import SettingsPage from '../pages/settings/SettingsPage';
import ProfilePage from '../pages/settings/ProfilePage';
import ProvidersPage from '../pages/settings/ProvidersPage';
import ModelsPage from '../pages/settings/ModelsPage';
import PluginsPage from '../pages/settings/PluginsPage';
import LogsPage from '../pages/settings/LogsPage';
import ThemePage from '../pages/settings/ThemePage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/negocios" element={<NegociosPage />} />
        <Route path="/negocios/agents" element={<AgentsPage />} />
        <Route path="/negocios/skills" element={<SkillsPage />} />
        <Route path="/negocios/workflows" element={<WorkflowsPage />} />
        <Route path="/negocios/memory" element={<MemoryPage />} />
        <Route path="/negocios/browser" element={<BrowserPage />} />
        <Route path="/negocios/artifacts" element={<ArtifactsPage />} />
        <Route path="/negocios/knowledge" element={<KnowledgePage />} />
        <Route path="/negocios/analytics" element={<AnalyticsPage />} />
        <Route path="/negocios/coding" element={<CodingPage />} />
        <Route path="/negocios/image" element={<ImagePage />} />
        <Route path="/negocios/video" element={<VideoPage />} />
        <Route path="/negocios/audio" element={<AudioPage />} />
        <Route path="/negocios/instagram" element={<InstagramPage />} />
        <Route path="/negocios/tiktok" element={<TikTokPage />} />
        <Route path="/negocios/youtube" element={<YouTubePage />} />
        <Route path="/negocios/finance" element={<FinancePage />} />
        <Route path="/negocios/marketing" element={<MarketingPage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="theme" element={<ThemePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
