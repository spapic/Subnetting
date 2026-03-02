# Aplikacija za subnetiranje

Jednostavna web aplikacija za izračun osnovnih subnet parametara za IPv4 adresu i CIDR prefiks.

## Pokretanje

```bash
python3 -m http.server 8000
```

Zatim otvori `http://localhost:8000` u pregledniku.

## Što računa

- mrežnu adresu
- broadcast adresu
- subnet masku
- wildcard masku
- prvi i zadnji host
- broj hostova i ukupan broj adresa
