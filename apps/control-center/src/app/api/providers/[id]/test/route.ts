import { NextRequest, NextResponse } from 'next/server';
import { providerCredentialService } from '@/services/provider-credential.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await providerCredentialService.testConnection(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to test connection:', error);
    return NextResponse.json({ error: 'Failed to test connection' }, { status: 500 });
  }
}
