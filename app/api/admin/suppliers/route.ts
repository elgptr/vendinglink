import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request) {
  try {
    const mappings = await prisma.supplierProductMapping.findMany({
      include: {
        product: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const products = await prisma.product.findMany({
      select: { id: true, name: true, supplierProductId: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ mappings, products });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
        product: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ mapping: newMapping }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Mapping already exists for this supplier code and product ID' }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
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
          supplierProductId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
