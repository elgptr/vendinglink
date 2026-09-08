import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sanitizeString } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  password: z.string().min(6).max(100),
});

const updateSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  settleDebt: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: {
        id: true,
        username: true,
        role: true,
        isApproved: true,
        isActive: true,
        outstandingDebt: true,
        createdAt: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Agents GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const username = sanitizeString(parsed.data.username).toLowerCase();

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const agent = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "AGENT",
        isApproved: true, // Directly added by Admin -> Approved by default
        isActive: true,
        outstandingDebt: 0,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isApproved: true,
        isActive: true,
        outstandingDebt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Agents POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, isActive, isApproved, settleDebt, password } = parsed.data;

    // Handle debt settlement if requested
    if (settleDebt) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { outstandingDebt: 0 },
        }),
        prisma.transaction.updateMany({
          where: {
            agentId: id,
            paymentType: "AGENT_CREDIT",
            isSettled: false,
          },
          data: { isSettled: true },
        }),
      ]);
    }

    const updateData: {
      isActive?: boolean;
      isApproved?: boolean;
      passwordHash?: string;
    } = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isApproved !== undefined) updateData.isApproved = isApproved;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    let agent;
    if (Object.keys(updateData).length > 0) {
      agent = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          role: true,
          isApproved: true,
          isActive: true,
          outstandingDebt: true,
          createdAt: true,
          _count: {
            select: { transactions: true },
          },
        },
      });
    } else {
      agent = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          isApproved: true,
          isActive: true,
          outstandingDebt: true,
          createdAt: true,
          _count: {
            select: { transactions: true },
          },
        },
      });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Agents PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
