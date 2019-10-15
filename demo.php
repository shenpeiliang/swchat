<?php
/**
 * Created by PhpStorm.
 * User: shenpeiliang
 * Date: 2018/12/7
 * Time: 9:54
 */
header('content-type:text/html;charset=utf-8');
$msg = "范德萨发face[微笑]fdsface[囧]face[馋嘴]face[汗]face[左哼哼]face[黑线]";

/**
 * 重建消息加上表情图片
 * @param $msg
 */
function rebuild_msg_faces($msg){
    $faces_config = require_once('./config/faces.php');

    var_dump($faces_config);exit();

    require_once './config/faces.php';
    if(!$msg){
        return ;
    }
    //正则替换
    $pattern = '/face\[[\w\x{4e00}-\x{9fa5}]{1,3}\]/u';

    $res = preg_replace_callback($pattern, function($matches) use ($config){
        $face = substr($matches[0], 4);
        foreach($config as $key => $item){
            if($item == $face){
                return '<img src="public/images/face/'. $key .'.gif"/>';
            }
        }
    },$msg);

    return $res;
}
$msg = rebuild_msg_faces($msg);
echo $msg;