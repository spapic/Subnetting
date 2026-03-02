# Aplikacija za subnetiranje

Web aplikacija za IPv4 mreže s više načina izračuna.

## Pokretanje

1. U istom folderu trebaju biti datoteke: `index.html`, `styles.css`, `app.js`.
2. U terminalu se pozicioniraj u taj folder.
3. Pokreni lokalni server:

```bash
python3 -m http.server 8000
```

4. Otvori `http://localhost:8000` u pregledniku.

## Funkcionalnosti

Sve opcije su prikazane **odmah na istom ekranu** (bez dropdown menija), i svaka sekcija ima svoj gumb za izračun.

1. **Osnovni izračun (IPv4 + CIDR)**
   - mrežna adresa, broadcast, maska, wildcard, host raspon.

2. **VLSM prema broju korisnika**
   - zadaš veliku mrežu (npr. `10.0.0.0/16`) i listu korisnika po podmrežama (npr. `120,60,30,10`),
   - aplikacija rasporedi podmreže od najveće prema manjoj.

3. **Broj podmreža i hostova**
   - zadaš veliku mrežu i prefiks podmreže,
   - aplikacija izračuna broj podmreža i broj hostova po podmreži.

4. **Sažimanje mrežnih adresa**
   - uneseš više CIDR mreža (jedna po retku),
   - aplikacija izračuna zajednički sažetak (supernet).
