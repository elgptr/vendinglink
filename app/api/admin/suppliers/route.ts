import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchBridgeSuppliers,
  createBridgeSupplier,
  updateBridgeSupplier,
} from '@/lib/bridge/suppliersClient';

export async function GET(_req: Request) {
  try {
    const mappings = await prisma.supplierProductMapping.findMany({
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = await prisma.product.findMany({
      select: { id: true, name: true, supplierProductId: true },
      orderBy: { name: 'asc' },
    });

    // Also fetch dynamic suppliers from Bridge
    const bridgeData = await fetchBridgeSuppliers();

    return NextResponse.json({
      mappings,
      products,
      suppliers: bridgeData.suppliers,
      builtIns: bridgeData.builtIns,
      bridgeError: bridgeData.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Check if this is a Bridge Supplier registration
    if (body.action === 'create_supplier') {
      const { code, displayName, baseUrl, authType, credentials, descriptor, validateImmediately } =
        body;

      if (!code || !displayName || !baseUrl || !credentials || !descriptor) {
        return NextResponse.json({ error: 'Field supplier tidak lengkap' }, { status: 400 });
      }

      const result = await createBridgeSupplier({
        code,
        displayName,
        baseUrl,
        authType: authType || 'API_KEY',
        credentials,
        descriptor,
        validateImmediately: validateImmediately !== false,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Gagal mendaftarkan supplier di Bridge' }, { status: 400 });
      }

      return NextResponse.json({ supplier: result.supplier, validation: result.validation }, { status: 201 });
    }

    // 2. Otherwise handle product mapping
    const { supplierCode, supplierProductId, productId } = body;

    if (!supplierCode || !supplierProductId || !productId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const newMapping = await prisma.supplierProductMapping.create({
      data: {
        supplierCode,
        supplierProductId,
        productId,
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ mapping: newMapping }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Mapping already exists for this supplier code and product ID' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { code, ...payload } = body;

    if (!code) {
      return NextResponse.json({ error: 'Kode supplier diperlukan' }, { status: 400 });
    }

    const result = await updateBridgeSupplier(code, payload);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Gagal memperbarui supplier' }, { status: 400 });
    }

    return NextResponse.json({ supplier: result.supplier });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierCode = searchParams.get('supplierCode');
    const supplierProductId = searchParams.get('supplierProductId');

    if (!supplierCode || !supplierProductId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await prisma.supplierProductMapping.delete({
      where: {
        supplierCode_supplierProductId: {
          supplierCode,
          supplierProductId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
