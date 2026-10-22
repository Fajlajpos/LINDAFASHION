# Obraz noční zálohy – `postgres:16-alpine` se skriptem uvnitř.
#
# Skript se dřív připojoval z repozitáře (`./deploy/zaloha.sh:/zaloha.sh`).
# Na holém serveru to stačí, ale Coolify k běžícím kontejnerům soubory
# z repozitáře nepřipojuje – relativní cesta by vytvořila prázdnou složku
# a zálohy by tiše nejely. Zapečený skript funguje všude stejně.
#
# Verze MUSÍ sedět se službou `postgres` v `docker-compose.yml`: `pg_dump`
# starší než server odmítne dumpovat.
FROM postgres:16-alpine
COPY zaloha.sh /zaloha.sh
