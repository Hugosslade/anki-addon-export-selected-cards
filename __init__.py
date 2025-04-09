from aqt import mw, gui_hooks
from aqt.browser import Browser
import webbrowser
import re
import os
import pathlib
from PyQt6.QtGui import QAction, QShortcut, QKeySequence
from PyQt6.QtCore import QStandardPaths, QUrl
from PyQt6.QtWidgets import QApplication
from anki.utils import ids2str
from aqt.qt import *
from aqt.utils import mungeQA, openLink
import sys


config = mw.addonManager.getConfig(__name__)
ADDON_ACTION_NAME = "Export Selected"

def sortFieldOrderCids(card_ids):
    return mw.col.db.list(
        """
select c.id from cards c, notes n where c.id in %s
and c.nid = n.id order by n.sfld"""
        % ids2str(card_ids)
    )


def copySelectedCardsToClipboard(browser):
    selected_cids = browser.selected_cards()
    all_cards_text = []

    # Regular expression to remove HTML tags
    tag_re = re.compile(r'<[^>]+>')

    fieldIndices = config.get("fieldIndices", [0]);
    
    for idx, cid in enumerate(selected_cids, 1):
        card = mw.col.getCard(cid)
        note = card.note()

        # Skip Image Occlusion cards
        if "ID (hidden)" in note:
            continue

        fields_text = []

        for fieldIndex in fieldIndices:
            field = note.fields[fieldIndex]
            plain_content = tag_re.sub('', field).strip()
            # Ignore empty fields
            if plain_content:
                fields_text.append(plain_content)

        card_text = "\n".join(fields_text)
        all_cards_text.append(card_text)

    # Add the "Prompt" from the config at the beginning
    prompt = config.get("Prompt", "")
    all_text = [prompt] + all_cards_text

    # Join all the text and copy to clipboard
    clipboard_text = '\n'.join(all_text)
    QApplication.clipboard().setText(clipboard_text)

    # a Path object pointing to the directory where your add-on file is located
    # pathlib.Path(__file__).parent.resolve()
    page_path = "file://" + os.path.join(pathlib.Path(__file__).parent.resolve(), "page/index.html")
    webbrowser.open(page_path, 2)
    webbrowser.open("https://chat.com", 2)


def add_menu_buttons(browser: Browser) -> None:
    export_action = QAction(ADDON_ACTION_NAME, browser)
    export_action.triggered.connect(lambda: copySelectedCardsToClipboard(browser))
    browser.form.menuEdit.addAction(export_action)
    browser.addAction(export_action)


def on_browser_will_show_context_menu(browser: Browser, menu: QMenu):
    export_action = QAction(ADDON_ACTION_NAME, browser)
    export_action.triggered.connect(lambda: copySelectedCardsToClipboard(browser))
    menu.removeAction(export_action) # Remove the action if it already exists (due to reloading)
    menu.addAction(export_action)


def addon_reloader_before():
    # This function is called before the addon is reloaded
    # It can be used to undo any changes made by the addon
    for action in mw.form.menuTools.actions():
        if action.text() == ADDON_ACTION_NAME:
            mw.form.menuTools.removeAction(action)
    # TODO: remove the action from the context menu as well, right now don't know how to access the Browser...

gui_hooks.browser_will_show_context_menu.append(on_browser_will_show_context_menu)
gui_hooks.browser_menus_did_init.append(add_menu_buttons)
