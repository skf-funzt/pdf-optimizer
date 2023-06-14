default:
    @just --choose

run:
    deno run --allow-run=gs,sh --allow-read --allow-write src/main.ts -d='./../magazines' -o='./example' -p=8

verbose:
    @just run -v

compile:
    deno compile --allow-run --allow-read --allow-write src/main.ts