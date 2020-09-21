import {Feature} from "modules";

import {HTML, Localization} from "core";
import {Background, DOMHelper, ExtensionLayer, SteamId} from "common";
import {ProfileData} from "community/common";
import Config from "config";

export default class FBackgroundSelection extends Feature {

    async apply() {

        this._active = false;

        this._checkPage();

        new MutationObserver(() => { this._checkPage(); })
            .observe(document.querySelector(`[class^="profileeditshell_PageContent_"]`), {"childList": true});
    }

    async _checkPage() {

        const html =
            `<div class='js-bg-selection as-pd'>
                
                <div class="DialogLabel as-pd__head" data-tooltip-text='${Localization.str.custom_background_help}'>
                    ${Localization.str.custom_background} <span class="as-pd__help">(?)</span>
                </div>
                
                <div class="DialogInput_Wrapper _DialogLayout">
                    <input type="text" class="DialogInput DialogInputPlaceholder DialogTextInputBase js-pd-game" value="" placeholder="${Localization.str.game_name}">
                </div>
                                
                <div class="as-pd__cnt">
                    <div class="as-pd__list js-pd-list"></div>
                </div>
                                
                <div class="as-pd__cnt">
                    <div class="as-pd__imgs js-pd-imgs"></div>
                </div>
                
                <div class="as-pd__buttons">
                    <button class='DialogButton _DialogLayout Secondary as-pd__btn js-as-pd-bg-clear'>${Localization.str.thewordclear}</button>
                    <button class='DialogButton _DialogLayout Primary as-pd__btn js-as-pd-bg-save'>${Localization.str.save}</button>
                </div>
            </div>`;

        if (document.querySelector(`[href$="/edit/background"].active`)) {

            if (this._active) { return; } // Happens because the below code will trigger the observer again

            HTML.beforeEnd(`[class^="profileeditshell_PageContent_"]`, html);

            this._gameFilterNode = document.querySelector(".js-pd-game");
            this._listNode = document.querySelector(".js-pd-list");
            this._imagesNode = document.querySelector(".js-pd-imgs");

            this._active = true;

            ExtensionLayer.runInPageContext(() => { SetupTooltips({ tooltipCSSClass: "community_tooltip" }); });

            this._selectedAppid = ProfileData.getBgAppid();
            let selectedGameKey = null;

            this._showBgFormLoading(this._listNode);

            let games = await Background.action("profile.background.games");

            for (let key in games) {
                if (!games.hasOwnProperty(key)) { continue; }
                games[key][2] = this._getSafeString(games[key][1]);

                if (games[key][0] === this._selectedAppid) {
                    selectedGameKey = key;
                }
            }

            this._hideBgFormLoading(this._listNode);

            let timeout = null;

            this._listNode.addEventListener("click", ({target}) => {
                if (!target.dataset.appid) { return; }
                this._selectGame(target.dataset.appid);
            });

            this._imagesNode.addEventListener("click", ({target}) => {
                let node = target.closest(".js-pd-img");

                if (!node) { return; }
                this._selectedImage = node.dataset.img;

                let currentSelected = document.querySelector(".js-pd-img.is-selected");
                if (currentSelected) {
                    currentSelected.classList.remove("is-selected");
                }

                node.classList.add("is-selected");
            });

            this._gameFilterNode.addEventListener("keyup", () => {

                if (timeout) {
                    window.clearTimeout(timeout);
                }

                timeout = window.setTimeout(() => {

                    const max = 100;
                    const value = this._getSafeString(this._gameFilterNode.value);
                    if (value === "") { return; }

                    let i = 0;
                    let list = "";
                    for (let [appid, title, safeTitle] of games) {
                        if (safeTitle.includes(value)) {
                            list += `<div class='as-pd__item js-pd-item' data-appid="${appid}">${title}</div>`;
                            i++;
                        }
                        if (i >= max) { break; }
                    }
                    HTML.inner(this._listNode, list);
                }, 200);
            });

            if (games[selectedGameKey]) {
                this._gameFilterNode.value = games[selectedGameKey][1];

                if (this._selectedAppid) {
                    this._selectGame(this._selectedAppid);
                }
            }

            document.querySelector(".js-as-pd-bg-clear").addEventListener("click", async () => {
                await ProfileData.clearOwn();
                window.location.href = Config.ApiServerHost + `/v01/profile/background/edit/delete/`;
            });

            document.querySelector(".js-as-pd-bg-save").addEventListener("click", async () => {
                if (this._selectedImage && this._selectedAppid) {
                    await ProfileData.clearOwn();

                    let selectedAppid = encodeURIComponent(this._selectedAppid);
                    let selectedImg = encodeURIComponent(this._selectedImage);
                    window.location.href = Config.ApiServerHost+`/v01/profile/background/edit/save/?appid=${selectedAppid}&img=${selectedImg}`;
                }
            });

        } else if (this._active) {
            DOMHelper.remove(".js-bg-selection");
            this._active = false;
        }
    }

    _getSafeString(value) {
        return value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    }

    async _selectGame(appid) {

        let result = await Background.action("profile.background", {
            appid,
            "profile": SteamId.getSteamId(),
        });

        this._selectedAppid = appid;
        let selectedImg = ProfileData.getBgImg();

        let images = "";
        for (let [url, title] of result) {
            let selectedClass = "";
            if (selectedImg === url) {
                selectedClass = " is-selected";
            }

            images +=
                `<div class="as-pd__item${selectedClass} js-pd-img" data-img="${url}">
                    <img src="${this._getImageUrl(url)}" class="as-pd__img">
                    <div>${title}</div>
                </div>`;
        }

        HTML.inner(this._imagesNode, images);
    }

    _getImageUrl(name) {
        return "https://steamcommunity.com/economy/image/" + name + "/622x349";
    }

    _showBgFormLoading(node) {
        HTML.inner(node,
            `<div class='es_loading'>
               <img src='https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif'>
               <span>${Localization.str.loading}</span>
             </div>`);
    }

    _hideBgFormLoading(node) {
        node.querySelector(".es_loading").remove();
    }
}
