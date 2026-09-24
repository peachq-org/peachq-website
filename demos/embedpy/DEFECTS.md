# Current embedPy integration issues

Reproduce with the public PeachQ v0.85 Linux glibc/DuckDB package and embedPy
1.5.0. This file is a developer handoff, not part of the rendered recipe.

## EMBEDPY-001: adjacent shell redirect loses command output

Run `q repros/shell-redirect.q`: expected `"hello"`, observed `()` with exit 0.
The spaced variant in `repros/shell-redirect-spaced.q` prints `"hello"`.
In the unmodified embedPy loader this loses Python probe output and loading
fails with `'type`. Workaround: change `\"2>` to `\" 2>` in `p.q`.

## EMBEDPY-002: K-mode composition expressions cannot load

Run `q repros/k-composition.q`: observed `'.k.e` and exit 1.
The embedPy loader uses this K expression and another for variadic composition.
The website recipe replaces both with q equivalents. This is an unsupported
K-source compatibility path, not evidence that the q equivalents are incorrect.

## EMBEDPY-003: NumPy 2 returns zero-filled data

With Python 3.10, NumPy 2.2.6 and the adapted embedPy 1.5.0 loader, run
`QHOME="$PWD" /path/to/glibc/q /path/to/repros/numpy-array.q` from the embedPy directory.
Expected `0 1 2 3 4` and `102.4`; observed `0 0 0 0 0` and `0f`, exit 0.
A SciPy fit also returned `0 0f` instead of `2 1f`.
Installing NumPy 1.26.4 restored all three results. The recipe installs `numpy<2`.
Ownership is unconfirmed: investigate the embedPy/NumPy ABI as well as PeachQ's
C interface. No other q runtime was used for comparison.
