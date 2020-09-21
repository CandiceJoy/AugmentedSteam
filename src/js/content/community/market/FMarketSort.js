import {Feature} from "modules";

import {HTML, HTMLParser, Localization} from "core";
import {DOMHelper} from "common";

export default class FMarketSort extends Feature {

    apply() {

        let container = document.querySelector("#tabContentsMyActiveMarketListingsTable");
        if (!container || !container.querySelector(".market_listing_table_header")) { return; }

        // Indicate default sort and add buttons to header
        function buildButtons() {
            if (document.querySelector(".es_marketsort")) { return; }

            // name
            DOMHelper.wrap(
                HTMLParser.htmlToElement("<span id='es_marketsort_name' class='es_marketsort market_sortable_column'></span>"),
                DOMHelper.selectLastNode(container, ".market_listing_table_header span").parentNode
            );

            // date
            let node = container.querySelector(".market_listing_table_header .market_listing_listed_date");
            node.classList.add("market_sortable_column");

            DOMHelper.wrap(
                HTMLParser.htmlToElement("<span id='es_marketsort_date' class='es_marketsort active asc'></span>"),
                node
            );

            // price
            node = DOMHelper.selectLastNode(container, ".market_listing_table_header .market_listing_my_price");
            node.classList.add("market_sortable_column");

            DOMHelper.wrap(
                HTMLParser.htmlToElement("<span id='es_marketsort_price' class='es_marketsort'></span>"),
                node
            );

            HTML.beforeBegin("#es_marketsort_name",
                "<span id='es_marketsort_game' class='es_marketsort market_sortable_column'><span>" + Localization.str.game_name.toUpperCase() + "</span></span>");
        }

        buildButtons();

        // add header click handlers
        let tableHeader = container.querySelector(".market_listing_table_header");
        if (!tableHeader) { return; }

        tableHeader.addEventListener("click", ({target}) => {
            let sortNode = target.closest(".es_marketsort");
            if (!sortNode) { return; }

            let isAsc = sortNode.classList.contains("asc");

            document.querySelector(".es_marketsort.active").classList.remove("active");

            sortNode.classList.add("active");
            sortNode.classList.toggle("asc", !isAsc);
            sortNode.classList.toggle("desc", isAsc);

            // set default position
            if (!container.querySelector(".market_listing_row[data-esi-default-position]")) {
                let nodes = container.querySelectorAll(".market_listing_row");
                let i = 0;
                for (let node of nodes) {
                    node.dataset.esiDefaultPosition = i++;
                }
            }

            sortRows(sortNode.id, isAsc);
        });

        container.addEventListener("click", function(e) {
            if (!e.target.closest(".market_paging_controls span")) { return; }
            document.querySelector(".es_marketsort.active").classList.remove("active");

            let dateNode = document.querySelector("#es_marketsort_date");
            dateNode.classList.remove("desc");
            dateNode.classList.add("active asc")
        });

        function sortRows(sortBy, asc) {
            let selector;
            let dataname;
            let isNumber = false;
            switch (sortBy) {
                case "es_marketsort_name":
                    selector = ".market_listing_item_name";
                    break;
                case "es_marketsort_date":
                    dataname = "esiDefaultPosition";
                    isNumber = true;
                    break;
                case "es_marketsort_price":
                    selector = ".market_listing_price";
                    break;
                case "es_marketsort_game":
                    selector = ".market_listing_game_name";
                    break;
            }

            let rows = [];
            let nodes = container.querySelectorAll(".market_listing_row");
            for (let node of nodes) {
                let value;
                if (selector) {
                    value = node.querySelector(selector).textContent.trim();
                } else {
                    value = node.dataset[dataname];
                }

                if (isNumber) {
                    value = parseInt(value);
                }

                rows.push([value, node]);
            }

            let s = (asc === true) ? 1 : -1;
            rows.sort(function(a,b) {
                if (a[0] === b[0]) { return 0;}
                if (isNumber) {
                    return asc ? b[0] - a[0] : a[0] - b[0];
                }

                return a[0] < b[0] ? s : -s;
            });

            for (let row of rows) {
                container.append(row[1]);
            }
        }

        /* TODO when do we need this?
        let observer = new MutationObserver(buildButtons);
        observer.observe(document.querySelector("#tabContentsMyActiveMarketListingsTable"), {childList: true, subtree: true});
        */
    }
}
