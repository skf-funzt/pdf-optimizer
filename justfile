default:
    @just --choose

extrasDefault := ''

run extras=extrasDefault:
    deno run --allow-run=sh --allow-read --allow-write src/main.ts {{extras}} -d='./../magazines' -o='./example' -p=4

verbose:
    @just run -v

compile:
    deno compile --allow-run --allow-read --allow-write --output ./pdf-optimizer src/main.ts