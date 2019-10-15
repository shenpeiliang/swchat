<?php
/**
 * Created by PhpStorm.
 * User: shenpeiliang
 * Date: 2018/12/6
 * Time: 15:25
 */
/**
 * 移除攻击代码
 */
function remove_xss($var) {
    static $_parser = null;
    if ($_parser === null) {
        require_once SRCPATH . 'libs/htmlpurifier/HTMLPurifier.includes.php';
        $config = HTMLPurifier_Config::createDefault ();
        $_parser = new HTMLPurifier ( $config );
    }
    if (is_array ( $var )) {
        foreach ( $var as $key => $val ) {
            $var [$key] = remove_xss ( $val );
        }
    } else {
        $var = $_parser->purify ( $var );
    }
    return $var;
}