// ==UserScript==
// @name         [Anobaka]ExHentai
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Auto select torrent to download.
// @author       You
// @match        https://exhentai.org/*
// @icon         https://www.google.com/s2/favicons?domain=exhentai.org
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const getTorrentPriority = e => {
        const downloadable = $(e).find('tr').eq(2).find('a');
        if (!downloadable) {
            return Number.MAX_VALUE;
        }
        return -parseInt(/\d+/.exec($(e).find('tr td').eq(3).text())[0]);
    };

    window.downloadTorrent = url => {
        // https://exhentai.org/gallerytorrents.php?gid=1968499&t=8806ea0d88
        $.get(url, c => {
            const $cq = $($.parseHTML(c));
            const $tables = $cq.find('#torrentinfo table');
            const $candidate = $tables.sort((a, b) => {
                return getTorrentPriority(a) - getTorrentPriority(b);
            }).eq(0);
            // console.log($candidate.text());
            location.href = $candidate.find('tr').eq(2).find('a').attr('href');
        });
    }


    $('.gl1t .gl5t .gldown').each((i, e) => {
        const $e = $(e);
        const $a = $e.find('a');
        if ($a.length > 0) {
            $e.css('display', 'flex');
            const url = $a.attr('href');
            const elem = $(`<a href="${url}" onclick="downloadTorrent('${url}'); return false;"><img src="https://exhentai.org/img/t.png" alt="T" title="Show torrents"></a>`);
            $e.append(elem);
        }
    });

})();