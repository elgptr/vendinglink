import { NextResponse } from 'next/server';
import { validateBridgeSupplier } from '@/lib/bridge/suppliersClient';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Kode supplier diperlukan' }, { status: 400 });
    }

    const result = await validateBridgeSupplier(code);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
