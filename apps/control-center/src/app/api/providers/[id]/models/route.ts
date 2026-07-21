import { NextRequest, NextResponse } from 'next/server';
import { providerCredentialService } from '@/services/provider-credential.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const models = await providerCredentialService.fetchModels(id);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
