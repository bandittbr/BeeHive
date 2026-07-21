import { NextRequest, NextResponse } from 'next/server';
import { providerCredentialService } from '@/services/provider-credential.service';

export async function GET() {
  try {
    const providers = await providerCredentialService.listProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Failed to list providers:', error);
    return NextResponse.json({ error: 'Failed to list providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerType, name, apiKey, baseUrl, config } = body;
    
    if (!providerType || !name || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields: providerType, name, apiKey' }, { status: 400 });
    }
    
    const provider = await providerCredentialService.createProvider({
      providerType,
      name,
      apiKey,
      baseUrl,
      config,
    });
    
    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    console.error('Failed to create provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
