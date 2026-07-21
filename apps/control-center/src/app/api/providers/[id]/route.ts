import { NextRequest, NextResponse } from 'next/server';
import { providerCredentialService } from '@/services/provider-credential.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const providers = await providerCredentialService.listProviders();
    const provider = providers.find(p => p.id === id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Failed to get provider:', error);
    return NextResponse.json({ error: 'Failed to get provider' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, apiKey, baseUrl, config, isDefault } = body;
    
    const provider = await providerCredentialService.updateProvider(id, {
      name,
      apiKey,
      baseUrl,
      config,
      isDefault,
    });
    
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Failed to update provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await providerCredentialService.deleteProvider(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
