from glypy.composition.ccomposition cimport CComposition

cdef class NeutralLoss(object):
    cdef:
        public CComposition composition
        public str name
        public double mass


cdef class FragmentBase(object):
    cdef:
        public NeutralLoss _neutral_loss
        public str name
        public object series


cdef class PeptideFragment(FragmentBase):
    cdef:
        public object series
        public int position
        public dict modification_dict
        public double bare_mass
        public list flanking_amino_acids
        public object glycosylation

cdef class SimpleFragment(FragmentBase):
    pass
