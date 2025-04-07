from aqt import mw, gui_hooks
from aqt.browser import Browser
import os
import re
from PyQt6.QtGui import QAction, QShortcut, QKeySequence
from PyQt6.QtCore import QStandardPaths, QUrl
from PyQt6.QtWidgets import QApplication
from anki.utils import ids2str
from aqt.qt import *
from aqt.utils import mungeQA, openLink
import sys


config = mw.addonManager.getConfig(__name__)

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


def add_menu_buttons(browser: Browser) -> None:
    export_action = QAction("Export Selected", browser)
    export_action.triggered.connect(lambda: copySelectedCardsToClipboard(browser))
    browser.form.menuEdit.addAction(export_action)
    browser.addAction(export_action)


def on_browser_will_show_context_menu(browser, menu):
    export_action = QAction("Export Selected", browser)
    export_action.triggered.connect(lambda: copySelectedCardsToClipboard(browser))
    menu.addAction(export_action)

gui_hooks.browser_will_show_context_menu.append(on_browser_will_show_context_menu)
gui_hooks.browser_menus_did_init.append(add_menu_buttons)
