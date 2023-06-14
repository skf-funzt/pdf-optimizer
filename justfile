default:
    @just --choose

run:
    deno run --allow-run=gs,sh --allow-read --allow-write src/main.ts -v -d='./../magazines' -o='./example'

compile:
    deno compile --allow-run --allow-read --allow-write src/main.ts