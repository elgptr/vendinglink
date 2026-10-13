import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchBridgeSuppliers,
  fetchBridgeSupplier,
  createBridgeSupplier,
  updateBridgeSupplier,
} from '@/lib/bridge/suppliersClient';
import { rezekiSupplier } from '@/lib/suppliers';

const BUILT_IN_DEFAULTS = [
  { code: 'RZK', displayName: 'Rezeki Shop', isBuiltIn: true },
  { code: 'PDA', displayName: 'Prime Digital', isBuiltIn: true },
  { code: 'DAI', displayName: 'Digital AI Store', isBuiltIn: true },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // ── Dedicated balance query action ──
    if (action === 'balance' || action === 'balances') {
      const targetCode = searchParams.get('code')?.toUpperCase() || 'ALL';

      const balances: Record<string, {
        code: string;
        displayName: string;
        balance: number | null;
        status: 'OK' | 'LOW' | 'ERROR' | 'CONFIG_IN_BRIDGE';
        error?: string | null;
        isBuiltIn: boolean;
        updatedAt: string;
      }> = {};

      // 1. Rezeki Shop (RZK)
      if (targetCode === 'ALL' || targetCode === 'RZK') {
        let rzkBalance: number | null = null;
        let rzkError: string | null = null;
        try {
          rzkBalance = await rezekiSupplier.checkBalance();
        } catch (e) {
          try {
            const bridgeRzk = await fetchBridgeSupplier('RZK');
            rzkBalance = bridgeRzk.currentBalance;
            if (!rzkBalance && bridgeRzk.error) {
              rzkError = bridgeRzk.error;
            }
          } catch {
            rzkError = e instanceof Error ? e.message : 'Gagal menghubungi Rezeki API';
          }
        }

        balances.RZK = {
          code: 'RZK',
          displayName: 'Rezeki Shop',
          balance: rzkBalance,
          status: rzkError ? 'ERROR' : (rzkBalance !== null && rzkBalance < 20000 ? 'LOW' : 'OK'),
          error: rzkError,
          isBuiltIn: true,
          updatedAt: new Date().toISOString(),
        };
      }

      // 2. Prime Digital (PDA)
      if (targetCode === 'ALL' || targetCode === 'PDA') {
        let pdaBalance: number | null = null;
        let pdaError: string | null = null;
        try {
          const bridgePda = await fetchBridgeSupplier('PDA');
          pdaBalance = bridgePda.currentBalance;
          pdaError = bridgePda.error || null;
        } catch {
          pdaError = 'Memerlukan konfigurasi di Bridge';
        }

        balances.PDA = {
          code: 'PDA',
          displayName: 'Prime Digital',
          balance: pdaBalance,
          status: pdaBalance !== null ? (pdaBalance < 20000 ? 'LOW' : 'OK') : 'CONFIG_IN_BRIDGE',
          error: pdaError,
          isBuiltIn: true,
          updatedAt: new Date().toISOString(),
        };
      }

      // 3. Digital AI Store (DAI)
      if (targetCode === 'ALL' || targetCode === 'DAI') {
        let daiBalance: number | null = null;
        let daiError: string | null = null;
        try {
          const bridgeDai = await fetchBridgeSupplier('DAI');
          daiBalance = bridgeDai.currentBalance;
          daiError = bridgeDai.error || null;
        } catch {
          daiError = 'Memerlukan konfigurasi di Bridge';
        }

        balances.DAI = {
          code: 'DAI',
          displayName: 'Digital AI Store',
          balance: daiBalance,
          status: daiBalance !== null ? (daiBalance < 20000 ? 'LOW' : 'OK') : 'CONFIG_IN_BRIDGE',
          error: daiError,
          isBuiltIn: true,
          updatedAt: new Date().toISOString(),
        };
      }

      // 4. Dynamic suppliers from Bridge
      if (targetCode === 'ALL' || (!['RZK', 'PDA', 'DAI'].includes(targetCode))) {
        try {
          const bridgeData = await fetchBridgeSuppliers();
          const targetSuppliers = targetCode === 'ALL'
            ? (bridgeData.suppliers || [])
            : (bridgeData.suppliers || []).filter(s => s.code === targetCode);

          for (const s of targetSuppliers) {
            let sBalance: number | null = null;
            let sError: string | null = null;
            try {
              const detail = await fetchBridgeSupplier(s.code);
              sBalance = detail.currentBalance;
              sError = detail.error || null;
            } catch (err) {
              sError = err instanceof Error ? err.message : 'Error';
            }

            balances[s.code] = {
              code: s.code,
              displayName: s.displayName,
              balance: sBalance,
              status: sError ? 'ERROR' : (sBalance !== null && sBalance < 20000 ? 'LOW' : 'OK'),
              error: sError,
              isBuiltIn: false,
              updatedAt: new Date().toISOString(),
            };
          }
        } catch {
          // ignore
        }
      }

      return NextResponse.json({
        success: true,
        balances,
      });
    }

    // ── Standard suppliers listing ──
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

    const builtIns = bridgeData.builtIns && bridgeData.builtIns.length > 0
      ? bridgeData.builtIns
      : BUILT_IN_DEFAULTS;

    return NextResponse.json({
      mappings,
      products,
      suppliers: bridgeData.suppliers || [],
      builtIns,
      bridgeStatus: {
        connected: !bridgeData.error,
        url: process.env.BRIDGE_URL || "http://localhost:5000",
        error: bridgeData.error || null,
      },
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
