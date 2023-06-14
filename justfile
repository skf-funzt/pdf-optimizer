default:
    @just --choose

extrasDefault := ''

run extras=extrasDefault:
    deno run --allow-run=gs,sh --allow-read --allow-write src/main.ts -d='./../magazines' -o='./example' -p=8 {{extras}}

verbose:
    @just run -v

compile:
    deno compile --allow-run --allow-read --allow-write src/main.ts