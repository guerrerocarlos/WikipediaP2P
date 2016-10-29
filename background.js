
var WebTorrent = require('webtorrent')
var sha = require('simple-sha1')

var client = new WebTorrent()
var asking_client = new WebTorrent()

var Buffer = require('safe-buffer').Buffer


var get_from_local_storage = function(key, default_value, cb){
    chrome.storage.local.get(key, function(res) {
        if (res[key] == undefined) {
            var info = {}
            info[key] = default_value
            res = info
            chrome.storage.local.set(info, function() {});
        } 
        cb(res[key])
    });
}

get_from_local_storage('wikipediap2p-state', true, function(state){
    active = state
    update_icon()
})

var save_in_local_storage = function(key, default_value){
    var info = {}
    info[key] = default_value
    chrome.storage.local.set(info, function() {
    });
}

var update_icon = function(){
   if(active){
       chrome.browserAction.setTitle({title: 'WikipediaP2P: ON'})
       chrome.browserAction.setIcon({path: 'img/icon38.png'})
   } else {
       chrome.browserAction.setTitle({title: 'WikipediaP2P: OFF'})
       chrome.browserAction.setIcon({path: 'img/icon38-OFF.png'})
   }
   save_in_local_storage('wikipediap2p-state', active)
   update_links()
}


chrome.browserAction.onClicked.addListener(function(tab){
    active = !active
    update_icon()
    info = {
        'running': active
    }
    chrome.storage.local.set(info, function() {
    });
})

// chrome.webRequest.onCompleted.addListener(function(details){
//     console.log('onCompleted detail', details)
// },
// {
//  urls: ["<all_urls>"]
// })

// chrome.webRequest.onErrorOccurred.addListener(function(details){
//     console.log('onErrorOccurred detail', details)
// },
// {
//  urls: ["<all_urls>"]
// })

//       chrome.webRequest.onBeforeRequest.addListener(function(details){
//           console.log('onbefore', details)},
//       {
//         urls: ["<all_urls>"],
//         types: ["main_frame"]
//       });

// console.log(client);

var cached_link_lists = {}
var tabs_urls_by_id = {}

var updated_cached_link_lists = function(){

    var cached_ll = {}
    var torrents_urls = Object.keys(torrents_by_url)
    for(var i = 0 ; i < torrents_urls.length ; i++){
        if(torrents_by_url[torrents_urls[i]].received > 0){
            cached_ll[torrents_urls[i]] = torrents_by_url[torrents_urls[i]].resulted
        } else {
            cached_ll[torrents_urls[i]] = {status: 'searching', url: torrents_urls[i]}   
        }
    }
    return cached_ll

}    

var update_links = function(){
    console.log('<background:update_links >')
    var result = {caches:updated_cached_link_lists(), status: active}
    chrome.tabs.query({}, function(tabs) {
        for(var i = 0; i < tabs.length ; i++){
            if(tabs[i].url.indexOf('wikipedia.org') > -1){
                tabs_urls_by_id[tabs[i].id] = tabs[i].url
                chrome.tabs.sendMessage(tabs[i].id, result);
            }
        }
    });
}

function onTorrent (torrent) {
    console.log('<---- background:onTorrent>')
    if(active){
        torrent.files.forEach(function (file) {
            file.getBuffer(function (err, b) {
            if (err) return log(err.message)
                var got_page = JSON.parse(b.toString('utf8'))
                
                torrents_by_url[got_page.url].resulted = got_page
                // cached_link_lists[got_page.url] = got_page
                update_links()
                running_searchers = running_searchers - 1;

            })
        });
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var cached_and_pending = {}
var running_searchers = 0
var max_searchers = 5
var torrents_by_url = {}


var get_next_in_line = function(){
    var originators = Object.keys(cached_and_pending)
    if(originators.length > 0){
        var first_originator_in_tree = originators[0]
        var all_urls_of_originator = Object.keys(cached_and_pending[first_originator_in_tree])
        if(all_urls_of_originator.length > 0){
            var next_in_line = all_urls_of_originator[0]
            delete cached_and_pending[originators[0]][all_urls_of_originator[0]]
            
            if(Object.keys(torrents_by_url).indexOf(next_in_line) === -1){
                return next_in_line
            } else {
                return get_next_in_line()        
            } 
        } else {
            delete cached_and_pending[first_originator_in_tree]
            return get_next_in_line()
        }

    } 
    return false
}


var tell_searchers = function(){

    if(running_searchers < max_searchers){
        var next_in_line = get_next_in_line()
        console.log('next_in_line', next_in_line)
        if(next_in_line){
            running_searchers = running_searchers + 1;
            var url = next_in_line
            console.log('Tell searchers')
            sha(url, function (result) {
                var magnet = 'magnet:?xt=urn:btih:'+result+'&dn=Unnamed+Torrent+1476907325739&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
                console.log('asking_client ADD!')
                torrents_by_url[url] = asking_client.add(magnet, onTorrent)
            })  
        }
    }
}

var clean_pending_searches = function(cb){

    var new_torrents_by_url = {}
    var torrents_urls = Object.keys(torrents_by_url)    
    var torrents_by_url_array = []
    for(var i = 0 ; i < torrents_urls.length ; i++){
        torrents_by_url[torrents_urls[i]].url =  torrents_urls[i]  
        torrents_by_url_array.push(torrents_by_url[torrents_urls[i]])
    }
    torrents_by_url_array.sort(function(a, b){
        if(a.created_date<b.created_date){
            return 1
        } else {
            return -1
        }
    })
    var pending_torrents_count = 0;
    for(var i = 0 ; i < torrents_by_url_array.length ; i++){
       if(torrents_by_url_array[i].received === 0){
           if(pending_torrents_count < 3){
                new_torrents_by_url[torrents_by_url_array[i].url] = torrents_by_url_array[i]           
           } else {
                asking_client.remove(torrents_by_url_array[i])
           }

           pending_torrents_count ++
       } else {
             new_torrents_by_url[torrents_by_url_array[i].url] = torrents_by_url_array[i]           
       }
    }
    torrents_by_url = new_torrents_by_url


    if(cb) cb()
    update_links()
}

var start_searcher = function(url, cb){
    running_searchers = running_searchers + 1;
    if(Object.keys(torrents_by_url).indexOf(url) === -1){
        sha(url, function (result) {
            var magnet = 'magnet:?xt=urn:btih:'+result+'&dn=Unnamed+Torrent+1476907325739&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
            torrents_by_url[url] = asking_client.add(magnet, onTorrent)
            torrents_by_url[url].created_date = new Date()
            console.log('[SEARCHING]: ', url, result, torrents_by_url[url] )
            clean_pending_searches(cb)
        })
    }
}

var searchForCache = function(url, originating_url, tabid, cb){
    console.log('<background:searchForCache>', url, originating_url)
    
    if(originating_url.indexOf('wikipedia.org') > -1){
        if(cached_and_pending[originating_url+tabid] == undefined){
            cached_and_pending[originating_url+tabid] = {}
        }
        cached_and_pending[originating_url+tabid][url] = {}
        // tell_searchers()

        start_searcher(url, cb)
    }

}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse)
{ 

    console.log('<background:onMessage.listener>', message, sender)
    if(message.ask_if_active){
        sendResponse({active: active})
        return true
    }

    if(active){
        if(message.href){
            searchForCache(message.href, message.originating_url, sender.tab.id)
            // var answer = {caches:updated_cached_link_lists(), status: active}
            // answer.caches[message.href] = {status: 'searching', url: message.href}
            // sendResponse(answer);
        } else {
            if(message.location_href.indexOf('wikipedia.org') > -1){
                var mergedPage = message.content
                mergedPage = mergedPage + '<style type="text/css">'+message.css+'</style>'

                var page = Buffer.from(mergedPage, 'utf8')
                sha(message.location_href, function (hash) {
                    sha(mergedPage, function (page_hash) {
                        var payload = {'date': new Date(), page: mergedPage, page_hash: page_hash, url: message.location_href, title: message.title}
                        console.log('payload', 'payload')
                        var buffer_payload = Buffer.from(JSON.stringify(payload), 'utf8')
                        var torrent = client.seed(buffer_payload,{forced_id: hash}, function(torrent){
                            console.log('client seed...', message.location_href, hash)
                            update_links()
                        });
                    })
                })
            }
            sendResponse({caches:updated_cached_link_lists(), status: active});
        }
    }
});

chrome.tabs.onRemoved.addListener(function(tabId){
    console.log("Tab removed event caught. ", tabs_urls_by_id[tabId]);
    var tab_url = tabs_urls_by_id[tabId]
    var all_links_of_tab = cached_and_pending[tab_url]
    console.log(cached_and_pending)
    console.log(all_links_of_tab)
});