This release adds several new features to both the backend and user interface:

**Upgrading Notes**

This new version uses a new installer (NSIS) with a different automatic update system incompatible with the old one (Squirrel). Please manually uninstall your previous version and install the new version. Your projects and data will still be accessible with the new version.

**Algorithmic Changes**

*Database Construction*

1.  **Custom Protease**: When specifying an enzymatic digest, under \"advanced options\", you may now use a custom protease by specifying a regular expression in the \"Custom Protease\" input.

1.  **Non-specific Digest**: When specifying an enzymatic digest, under \"advanced options\", you may now use a non-specific digest, though be aware it will greatly increase the search space.

3.  **Reverse Protein Decoys**: You may now specify that you want to generate reverse protein decoys when generating a glycopeptide search space. This will cause GlycReSoft to build two databases, one for target proteins and one for decoy proteins. When you select the target hypothesis when setting up a database search job, GlycReSoft will use the paired decoy database instead of the original \"reverse peptide\" approach.

4.  **No Crossproduct for Indexed Search**: You may now specify you want to *not* produce a full crossproduct of peptide by glycan while building your search space. This type of database is compatible with the faster indexed search algorithm but it *requires* peptide+Y ions be present in the spectra to search. If this option is chosen, the hypothesis *must* have a reverse protein decoy database (enforced automatically).

5.  **Ragged Signal Peptide Annotation**: When building a glycopeptide search space from UniProt, GlycReSoft currently fetches sequence annotations from UniProt to locate where endogenous enzymatic cleavage sites may be, including where the signal peptide may be cleaved. In order to account for recurring observations that signal peptide cleavage sites are unreliable, GlycReSoft will now generate peptides cleaved up to 10 amino acids beyond the annotated signal peptide cleavage site.

6.  **Glycan Text Formats**:  GlycReSoft now understands the glycan composition notation from Byonic and Glyconnect, which are simpler and much more widespread than the original IUPAClite notation. The glycan class must still be specified as normal however. These three forms are equivalent:

    1.  {Hex:3; HexNAc:2}  N-Glycan  O-Glycan
        {d-Hex:1; Hex:3; HexNAc:2}  N-Glycan
    2.  HexNAc:2 Hex:3  N-Glycan  O-Glycan
        dHex:1 Hex:3 HexNAc:2  N-Glycan
    3.  HexNAc(2)Hex(3)  N-Glycan  O-Glycan
        dHex(1)Hex(3)HexNAc(2)  N-Glycan

*Identification*

1.  **Adduct Deconvolution Parsimony**: When searching with mass shifts, the search  will now try to select the mass shift arrangement that is most parsimonious at the chromatographic level, preferring solutions which produce chromatographically overlapping forms of adducted and unadducted forms. If a solution with an adduct is found that does not have an unadducted version nearby in time, the algorithm will seek an unadducted alternative assignment passing the required FDR threshold. If no alternative is found, an adducted-only assignment may still be used.

2.  **Retention Time Modeling**: Retention time modeling is now part of the glycopeptide identification workflow. It is enabled by default but users may opt not to use it to receive the previous behavior. This feature fits a series of local models to learn the influence of monosaccharides on retention time, and uses them to produce a confidence metric for each glycopeptide. Based upon these metrics, it may attempt to revise the glycan composition assigned to some glycopeptides, especially those that may have been affected by isobaric substitutions and monoisotopic peak assignment errors. This feature does not operate on unassigned spectra or chromatographic features.

3.  **Indexed Search with Joint Peptide and Glycan FDR Model**: When using a search space without a full crossproduct and a reverse protein decoy database, the new indexed search algorithm will be used. This *requires* peptide+Y ions be present in order to accurately identify glycopeptides, and these ions will be used to compute a glycan FDR. Reverse protein decoy matches will be used to compute a peptide FDR. A joint FDR will be estimated from the glycan and peptide FDRs together. This search algorithm is substantially faster than the classic search algorithm, being capable of search a proteome-scale database in under an hour instead of days, at the cost of using more memory.

4.  **Reverse Protein Decoys in Classic Search**: If a reverse protein decoy database is created with a full crossproduct enabled, the classic search will use reverse protein decoys instead of reverse peptide decoys. This may make the FDR estimate less conservative for small search spaces, more generally more accurate for large ones. Bear in mind that this approach is still vulnerable to peptide+Y ion sharing between targets and decoys, it is just less common.

**Notable Bug Fixes**

-   The UI for specifying custom peptide modifications now reports validates site specifications correctly when the site is just a sequence terminal, e.g. \"N-term\" instead of \"Q @ N-term\".
-   A custom peptide modification is correctly added to the set of options immediately after it is created. Previously it may have been added with incorrect specificities. Custom modifications were recorded correctly on the backend, but the UI was updated incorrectly in some cases, leading to the incorrect site specificities being used if the modification rule were specified during the same session that they were created.

**Platform Changes**

The previous GlycReSoft releases were made using Python 2.7 and Electron 1.47 which are now well beyond their end-of-life dates. This new release uses Python 3.8 and Electron 12. While we have tested the new platform to the best of our abilities, some features may still have defects because of these two large changes please let us know if there are any failures so we can address them in a timely fashion.
