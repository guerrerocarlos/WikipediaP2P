# WikipediaP2P
This Chrome Extension can me installed directly from http://www.wikipediap2p.org/

This extension is based on [Webtorrent](http://webtorrent.io/) technologies and handles all Peer to Peer communication using WebRTC.

All pull requests and improvements are welcome.

## How it works

An *on-mouseover* event is added to all links inside [wikipedia.org](http://wikipedia.org), it causes that link to be searched on the WikipediaP2P Peer2Peer network, by hashing it's URL.

WikipediaP2P is limited to search max. 5 links from the P2P network at the same time for performance reasons. 

While the link is being searched it is colored in 'orange'.

As soon as the content is obtained from another peer, the link is colored 'green'.

If the content can't be found from the P2P network, it will get it from wikipedia as usual when clicked on it.

## Webtorrent modification

An modified version of [guerrerocarlos/webtorrent](http://github.com/guerrerocarlos/webtorrent) is used to allow torrents to be created with custom hashes that match the URL that created them.
