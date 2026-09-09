-- CreateTable
CREATE TABLE "ZmenaEmailu" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "novyEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "platnyDo" TIMESTAMP(3) NOT NULL,
    "pouzitoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZmenaEmailu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZmenaEmailu_tokenHash_key" ON "ZmenaEmailu"("tokenHash");

-- CreateIndex
CREATE INDEX "ZmenaEmailu_userId_idx" ON "ZmenaEmailu"("userId");

-- AddForeignKey
ALTER TABLE "ZmenaEmailu" ADD CONSTRAINT "ZmenaEmailu_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
