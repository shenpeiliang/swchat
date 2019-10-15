<?php
define('SRCPATH', dirname(__FILE__) .'/');
require_once SRCPATH . 'Chat.class.php';
//$server = new Chat("0.0.0.0", 9502);
$server = new Chat("0.0.0.0", 9502, SWOOLE_PROCESS, SWOOLE_SOCK_TCP | SWOOLE_SSL);
$server->set(array(
    'ssl_cert_file' => '/etc/letsencrypt/live/chat.7keit.com/fullchain.pem',
    'ssl_key_file' => '/etc/letsencrypt/live/chat.7keit.com/privkey.pem'
));

$server->redis = NULL;

//人名
$server->names_config = require_once(SRCPATH . 'config/names.php');
//表情图片配置
$server->faces_config = require_once(SRCPATH . 'config/faces.php');

$server->on('workerstart',function(swoole_websocket_server $server,$id){
        //在多个进程之间，不可共用连接
        $redis = new redis();
        $flag = $redis->connect('redis5.0.3',6379);
        if(!$flag)
           die('Redis连接失败');
        $server->redis = $redis;
});
$server->on('open', function (swoole_websocket_server $server, $request) {
        $server->opening($server->redis,$request, $server->names_config);
    });
$server->on('message', function (swoole_websocket_server $server, $frame) {  
        $server->messaging($server->redis,$frame,$server->faces_config);
    });
$server->on('close', function (swoole_websocket_server $server, $fd) {
        $server->closing($server->redis,$fd); 
    });
$server->on('request', function (swoole_http_request $request, swoole_http_response $response) {
        global $server;//调用外部的server
        // $server->connections 遍历所有websocket连接用户的fd，给所有用户推送
        foreach ($server->connections as $fd) {
            $this->server->push($fd, $request->get['message']);
        }
    });

$server->start();
?>
