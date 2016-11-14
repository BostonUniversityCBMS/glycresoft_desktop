"use strict"


const Project = require("./project")

const ProjectSelectionWindow = require("./project-manager")

const {PROJECTS_KEY, PROJECT_FILE, VERSION} = require("./constants")

module.exports = {
    Project,
    ProjectSelectionWindow,
    PROJECTS_KEY,
    PROJECT_FILE,
    VERSION
}
