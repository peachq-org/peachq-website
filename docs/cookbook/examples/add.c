#include "k.h"

K add(K x, K y) {
    if (x->t != -KJ || y->t != -KJ) return krr("type");
    return kj(x->j + y->j);
}

K total(K x) {
    if (x->t != KF) return krr("type");
    F s = 0;
    for (J i = 0; i < x->n; i++) s += kF(x)[i];
    return kf(s);
}

K twice(K f, K x) {
    return k(0, "{x x y}", r1(f), r1(x), (K)0);
}
