# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

import sublime, sublime_plugin
from os import path

class GoToPackageFileCommand(sublime_plugin.TextCommand):
  def run(self, edit):
    f = self.view.file_name()
    curFolder = path.dirname(f)
    print("Current folder: {0}".format(curFolder))
    packagejs = self.find_package_js(curFolder)
    if packagejs:
      print("Found {0}".format(packagejs))
      sublime.active_window().open_file(packagejs)
    else:
        sublime.status_message("package.js not found in hierarchy of {0}".format(curFolder))




  def find_package_js(self, f):
    print("Checking '{0}'".format(f))
    packagejs = path.join(f, "package.js")
    if path.isfile(packagejs):
      return packagejs
    else:
        newF = path.dirname(f)
        if newF != f:
          return self.find_package_js(newF)
