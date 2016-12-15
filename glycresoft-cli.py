import matplotlib
try:
    matplotlib.use("agg")
except:
    pass
import multiprocessing
from brainpy._c import composition, isotopic_constants, double_vector, isotopic_distribution
from ms_peak_picker._c import double_vector
from rdflib.plugins import stores
from rdflib.plugins.stores import sparqlstore

import ms_deisotope
from ms_deisotope._c import averagine, scoring, deconvoluter_base
import glypy
from glypy.plot import plot
from glycan_profiling.cli.__main__ import main


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
