# Verificar configuração OAuth
import sys

railway_url = 'https://beehive-production-d895.up.railway.app'
vercel_url = 'https://beehiveos.vercel.app'

try:
    import urllib.request
    import json
    
    # Check YouTube OAuth config
    req = urllib.request.Request(f'{railway_url}/oauth/apps/youtube')
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        print(f"✅ YouTube OAuth configured: {data.get('configured', False)}")
    
    # Check Vercel status
    req2 = urllib.request.Request(vercel_url)
    with urllib.request.urlopen(req2, timeout=10) as response:
        print(f"✅ Frontend status: {response.status}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
