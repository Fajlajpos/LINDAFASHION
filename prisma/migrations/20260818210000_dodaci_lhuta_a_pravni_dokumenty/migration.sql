-- Doba dodání a uchovávané znění právních dokumentů.
--
-- 1. `dodaciLhutaDnu` – § 1820 odst. 1 písm. h) o. z. žádá sdělit dobu dodání
--    před uzavřením smlouvy. Na webu nebyla nikde. Číslo, ne text: větu složí
--    kód na jednom místě, takže se nemůže rozejít mezi detailem produktu,
--    pokladnou a obchodními podmínkami.
--
-- 2. `PravniDokument` – `Settings.verzePodminek` se zapisuje ke každé
--    objednávce, ale samotné znění podmínek bylo natvrdo v JSX. Štítek tedy
--    ukazoval na text, který nikdo neuchovával: doložit, S ČÍM zákaznice
--    souhlasila, nešlo. Tabulka je append-only ze stejného důvodu jako
--    `PriceHistory` – je to důkaz, ne obsah ke správě.
--
--    Verze je unikátní v rámci druhu dokumentu: dvě různá znění pod stejným
--    štítkem by snímek u objednávky proměnily v nejednoznačný odkaz, což je
--    přesně ten stav, který se tím řeší.

ALTER TABLE "Settings" ADD COLUMN "dodaciLhutaDnu" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE "PravniDokument" (
    "id" TEXT NOT NULL,
    "druh" TEXT NOT NULL,
    "verze" TEXT NOT NULL,
    "nadpis" TEXT NOT NULL,
    "obsah" TEXT NOT NULL,
    "ucinnostOd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PravniDokument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PravniDokument_druh_verze_key" ON "PravniDokument"("druh", "verze");

-- Nejnovější účinné znění daného druhu je nejčastější dotaz na téhle tabulce
-- (vykresluje se s každým zobrazením obchodních podmínek).
CREATE INDEX "PravniDokument_druh_ucinnostOd_idx" ON "PravniDokument"("druh", "ucinnostOd");
