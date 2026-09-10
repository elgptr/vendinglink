const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = "PASSWORD_BARU_ANDA"; // Ganti string ini dengan password baru
  const hash = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { username: "admin" },
    data: { passwordHash: hash }
  });
  
  console.log("Password admin berhasil diubah!");
}

main().finally(() => prisma.$disconnect());
