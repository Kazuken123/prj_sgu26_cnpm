"""Prepare the current nine-image manifest for the Google Docs connector.

Native edits require a current document revision and connector readback; this
legacy entry point does not insert duplicate images or use stale text anchors.
"""
import runpy

if __name__ == '__main__':
    runpy.run_module('full_gdoc_sync', run_name='__main__')
