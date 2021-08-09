// ==UserScript==
// @name         [Anobaka]Pixiv
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Auto select torrent to download.
// @author       You
// @match        https://pixiv.net/*
// @match        https://www.pixiv.net/*
// @icon         https://www.google.com/s2/favicons?domain=pivix.net
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    const CustomBtnClass = "anobaka-follow";
    const CustomFollowingClass = "anobaka-following";
    const CustomNotFollowedClass = "anobaka-not-followed";
    const user$ItemsMappings = {};

    console.log("Initializing Anobaka-Pixiv");

    const unfollow = (userId, success) => {
        $.ajax({
            url: "https://www.pixiv.net/rpc_group_setting.php",
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            data: `mode=del&type=bookuser&id=${userId}&tt=${pixiv.context.token}`,
            type: "post",
            success: (data, xhr) => {
                console.log("unfollow result", data, xhr);
                success();
            },
            error: (xhr) => {
                alert("failed to unfollow user");
                console.log("failed to unfollow user due to error", xhr);
            },
        });
    };

    const follow = (userId, success) => {
        $.ajax({
            url: "https://www.pixiv.net/bookmark_add.php",
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            data: `mode=add&type=user&user_id=${userId}&restrict=0&format=json&tt=${pixiv.context.token}`,
            type: "post",
            success: (data, xhr) => {
                console.log("follow result", data, xhr);
                success();
            },
            error: (xhr) => {
                alert("failed to follow user");
                console.log("failed to follow user due to error", xhr);
            },
        });
    };

    const queryFollow = (userIds, cb) => {
        $.get(
            `https://www.pixiv.net/rpc/get_profile.php?user_ids=${userIds.join(",")}`,
            (rsp) => {
                if (rsp.error) {
                    alert("An error occurred during query following states");
                    console.log(rsp);
                } else {
                    const data = rsp.body.reduce((s, t) => {
                        s[t.user_id] = t.is_follow;
                        return s;
                    }, {});
                    cb(data);
                }
            }
        );
    };

    let working = false;

    const core = () => {
        if (!working) {
            working = true;
            const $items = $(".ranking-item");
            // id - { $items: [], following: undefined/true/false }
            $items.each((i, t) => {
                const $t = $(t);
                const id = $t.find(".user-container").data("user_id");
                const user =
                    user$ItemsMappings[id] ?? (user$ItemsMappings[id] = { $items: [] });
                const $followBtn = $t.children(`.${CustomBtnClass}`);
                const queried = $followBtn.length > 0;

                if (user.following !== undefined) {
                    // add btn to current element
                } else {
                    if (queried) {
                        user.following = $followBtn.hasClass(CustomFollowingClass);
                    }
                }
                user.$items.push($t);
            });
            // console.log(user$ItemsMappings);

            const refreshUi = (user$ItemsMappings) => {
                Object.keys(user$ItemsMappings).forEach((d) => {
                    const data = user$ItemsMappings[d];
                    data.$items.forEach(($t) => {
                        // 2021-08-09 update: remove immediately
                        if (data.following) {
                            $t.remove();
                            return;
                        }
                        // Add follow button
                        let $btn = $t.children(`.${CustomBtnClass}`);
                        if ($btn.length === 0) {
                            $btn = $("<button></button>")
                                .addClass(CustomBtnClass)
                                .data("id", d);
                            $t.append($btn);
                        }
                        if (data.following) {
                            if (!$btn.hasClass(CustomFollowingClass)) {
                                $btn
                                    .addClass(CustomFollowingClass)
                                    .removeClass(CustomNotFollowedClass)
                                    .css("color", "#666")
                                    .css("background-color", "#E3E3E3")
                                    .css("border-color", "#E3E3E3")
                                    .text("已关注");
                            }
                        } else {
                            if (!$btn.hasClass(CustomNotFollowedClass)) {
                                $btn
                                    .addClass(CustomNotFollowedClass)
                                    .removeClass(CustomFollowingClass)
                                    .css("color", "#fff")
                                    .css("background-color", "#0086e0")
                                    .css("border-color", "#0086e0")
                                    .text("关注");
                            }
                        }
                    });
                });
                working = false;
            };

            const unqueriedUserIds = Object.keys(user$ItemsMappings).filter(
                (i) => user$ItemsMappings[i].following === undefined
            );
            if (unqueriedUserIds.length > 0) {
                console.log("found unqueried users, querying first");
                queryFollow(unqueriedUserIds, (data) => {
                    Object.keys(data).forEach((d) => {
                        user$ItemsMappings[d].following = data[d];
                    });
                    refreshUi(user$ItemsMappings);
                });
            } else {
                console.log("all users are queried, skipping querying");
                refreshUi(user$ItemsMappings);
            }
        }
    };

    const followActions = {
        [CustomFollowingClass]: {
            method: unfollow,
            follow: false,
        },
        [CustomNotFollowedClass]: {
            method: follow,
            follow: true,
        },
    };

    Object.keys(followActions).forEach((c) => {
        const { method, follow } = followActions[c];
        $(".ranking-item").on("click", `.${c}`, (e) => {
            const $e = $(e.target);
            const id = $e.data("id");
            method(id, () => {
                console.log(id, user$ItemsMappings);
                user$ItemsMappings[id].following = follow;
                refreshButtons(user$ItemsMappings);
            });
        });
    });

    setInterval(() => {
        core();
    }, 1000);
})();