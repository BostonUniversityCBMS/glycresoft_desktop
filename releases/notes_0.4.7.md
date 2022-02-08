# Release v0.4.7

## Bug Fixes
1. An update to the project storage system caused an error when trying to create a
   project on a machine that had not previously created a project with the older version
   of the storage system. This bug is now fixed.
2. When a glycan could be both *N*-linked *and* *O*-linked, the indexed search would only
   consider one version arbitrarily. This has been fixed. If an *O*-glycan is assigned where
   an *N*-glycan is expected, there may be ambiguity in the glycan fragments or localizing ions