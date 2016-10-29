
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var cached_link_lists = []
var cached_mark = "*"
var history_initialized = false
var incentive_messages = [
  'You used <b>Wikipedia P2P</b> to load this page and saved bandwidth/money to the Wikipedia Foundation.',
  'You used <b>Wikipedia P2P</b> to load this page.',
  'Thanks for using <b>Wikipedia P2P</b> and help to reduce Wikipedia\'s yearly costs.',
  'By using <b>Wikipedia P2P</b> you are helping to Wikipedia\'s mission.',
  '<b>[Wikipedia P2P]</b>'
]

var is_wikipediap2p_active = true

var update_links_colors_and_clicks = function(){
  console.log('<update_links_colors_and_clicks>', cached_link_lists)
  var all_links = document.getElementsByTagName('a') 

  for(var i = 0 ; i < all_links.length ; i++ ){
    var each_url = all_links[i].href.split("#")[0] 
    if(cached_link_lists 
    && cached_link_lists[each_url] 
      && cached_link_lists[each_url].url.indexOf(window.location.href) === -1 && is_wikipediap2p_active){
      var link_to_page = all_links[i]

      if(all_links[i].searching_cache){
        console.log('>>> clearing lnk:', all_links[i])

      }
      if(cached_link_lists[each_url].status){
        link_to_page.style.color = 'orange' 
      } else {
        link_to_page.style.color = 'green'  
        link_to_page.cache_done = true
        link_to_page.onclick = function(event){
          if(is_wikipediap2p_active){
            event.preventDefault();
            if(!history_initialized){
              window.history.pushState({page: document.documentElement.innerHTML, title: document.title},"", window.location.href);
            }
            console.log(cached_link_lists)
            document.documentElement.innerHTML = cached_link_lists[event.target.href].page
            document.title = cached_mark+' '+cached_link_lists[event.target.href].title
            var date = new Date(cached_link_lists[event.target.href].date)
            document.getElementById('p-personal').innerHTML = incentive_messages[getRandomInt(0, incentive_messages.length-1)]
            document.getElementById('p-personal').style.color = 'grey' // orange
            document.getElementById('p-personal').style.fontSize = '12px' 
            activate_links()
            window.history.pushState({page: cached_link_lists[event.target.href].page, title: cached_link_lists[event.target.href].title},"", cached_link_lists[event.target.href].url);
          }
        }

      }
    } else {

      if(all_links[i].searching_cache){
        all_links[i].style.color = ''
        all_links[i].searching_cache = undefined
        console.log('>>> clearing lnk:', all_links[i])

      }

      // all_links[i].style.color = ''
      // all_links[i].onmouseover = function(e){
      //       if(!e.target.searching_cache && !e.target.cache_done && is_wikipediap2p_active){
      //         // e.target.prev_color = e.target.style.color
      //         // e.target.style.color = '#20b4c5'
      //         e.target.wait_timeout = setTimeout(function(){
      //           e.target.searching_cache = true
      //           chrome.runtime.sendMessage(
      //           {
      //             originating_url: window.location.href,
      //             href: e.target.href,
      //           }//, 
      //           // function(response){
      //           //   is_wikipediap2p_active = response.status
      //           //   cached_link_lists = response.caches
      //           //   update_links_colors_and_clicks()
      //           //   activate_links()
      //           // }
      //           );
      //         }, 100)
      //       }
      //     }
    }
  }
}  
var is_extension_active = function(cb){
  console.log('<is_extension_active>')
  
        chrome.runtime.sendMessage(
      {
        ask_if_active: true,
      }, function(response){
        console.log('got response: ', response)
        is_wikipediap2p_active = response.active
        cb()
      })

}

var activate_links = function(){
  console.log('<activate_links>')
  // is_extension_active(function(){
    console.log('checking all links and updating their colors...')
    var lks = document.getElementsByTagName('a')
      for(i = 0; i < lks.length; i++){
        // if(lks[i].href.indexOf(document.domain) > -1){
          lks[i].onmouseover = function(e){
            if(!e.target.searching_cache && !e.target.cache_done && is_wikipediap2p_active){
              // e.target.prev_color = e.target.style.color
              // e.target.style.color = '#20b4c5'
              e.target.wait_timeout = setTimeout(function(){
                e.target.searching_cache = true
                chrome.runtime.sendMessage(
                {
                  originating_url: window.location.href,
                  href: e.target.href,
                }//, 
                // function(response){
                //   is_wikipediap2p_active = response.status
                //   cached_link_lists = response.caches
                //   update_links_colors_and_clicks()
                //   activate_links()
                // }
                );
              }, 100)
            }
          }
          lks[i].onmouseout = function(e){
            if(!e.target.searching_cache && is_wikipediap2p_active){
              clearTimeout(e.target.wait_timeout)
              // e.target.style.color = e.target.prev_color
            }
          }
        // }
      }
  // })
  
}


if(document.domain.toLowerCase().indexOf('wikipedia') > -1){
  var links = document.getElementsByTagName('link')
  var pageCssCache = ""

  for(i = 0; i < links.length; i++){
    if(links[i].rel.indexOf('stylesheet') > -1){
      cssRules = links[i].sheet.cssRules
      for(r = 0; r < cssRules.length ; r++){
        pageCssCache = pageCssCache + cssRules[r].cssText
      }
    }
  }

  var styles = document.getElementsByTagName('style')

  for(i = 0; i < styles.length; i++){
      cssRules = styles[i].innerHTML
      pageCssCache = pageCssCache + cssRules
  }


  chrome.runtime.sendMessage(
  {
    location_href: window.location.href,
    content: document.documentElement.innerHTML,
    title: document.title,
    css:  pageCssCache,
    command: 'page_loaded',
  }, function(respose){
    is_wikipediap2p_active = respose.status
    cached_link_lists = respose.caches
    if(is_wikipediap2p_active){
      activate_links()
    }
    // update_links_colors_and_clicks()
    // activate_links()
  });


  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log('<end:onMessage.listener>', request)
        is_wikipediap2p_active = request.status
        cached_link_lists = request.caches
        // activate_links()
        update_links_colors_and_clicks()
        activate_links()
  });
  window.onpopstate = function(to) {
    document.documentElement.innerHTML = to.state.page
    document.title = to.state.title

    activate_links()
    
    update_links_colors_and_clicks()
    
  }
}

