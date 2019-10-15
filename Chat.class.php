<?php
require_once SRCPATH . 'helper/xss.php';
class Chat extends swoole_websocket_server{

 	const USER_KEY = 'user:';
 	const USER_NUM_KEY = 'user_num';
  	const USER_GROUP_DEFAULT = 'public';

 	const EVENT_SYSTEM = 'system';
 	const EVENT_GROUP = 'group';
 	const EVENT_MESSAGE = 'message';
 	const EVENT_ONLINE = 'online';
 	const EVENT_CHANGE = 'change';//修改昵称
	const EVENT_USER = 'user';//用户信息
  //连接
  public function opening($redis,$request, $names_config){
    $redis->incr(self::USER_NUM_KEY);
    $group = $request->get['group'] ? : self::USER_GROUP_DEFAULT;

    $data = array(
       'token' => $this->getToken(). str_pad($request->fd,3,'0',STR_PAD_LEFT),
       'uname' => $names_config[mt_rand(0, 19)],
	   'avatar' => 'images/avatar/'. mt_rand(1, 20) . '.jpg',
       'group' => $group,
       'ip' => $request->server['remote_addr']
    );
    $redis->hMset(self::USER_KEY.$request->fd,$data);

		//当前用户信息
		$data_user = array(
			'token' => $data['token'],
			'uid' => $request->fd,
			'uname' => $data['uname'],
			'avatar' => $data['avatar'],
		);
	  //发送当前用户信息
	  $this->send_mess($redis,$request->fd, $request->fd, $data_user, self::EVENT_USER);

    //在线用户
    $data_online = $this->getOnlineUserList($redis,$group);
    $this->send_mess($redis,$request->fd,$request->fd,$data_online,self::EVENT_ONLINE);

      //用户上线系统通知
      $message_system = '欢迎 '. $data['uname'] .' 加入聊天~';
      $this->send_mess($redis,$request->fd,$request->fd, $message_system, self::EVENT_SYSTEM);
  }

    /**
     * 重建消息内容-表情图片
     * @param $msg
     * @param $faces_config 表情配置
     * @return mixed|void
     */
    protected function rebuild_msg_faces($msg, $faces_config){
        if(!$msg){
            return ;
        }
        //正则替换
        $pattern = '/face\[[\w\x{4e00}-\x{9fa5}]{1,5}\]/u';
        $res = preg_replace_callback($pattern, function($matches) use ($faces_config){
            $face = substr($matches[0], 4);
            foreach($faces_config as $key => $item){
                if($item == $face){
                    return '<img src="images/face/'. $key .'.gif"/>';
                }
            }
        },$msg);

        return $res;
    }

  //发送消息
  public function messaging($redis,$frame, $faces_config){
    $data = json_decode($frame->data,true);
    $message = remove_xss( trim($data['message']) );

      //替换表情处理
      $message =  $this->rebuild_msg_faces($message, $faces_config);

	  //默认群发消息
	  $fd_to = $data['to_uid'];
    $event = $fd_to ? self::EVENT_MESSAGE : self::EVENT_GROUP;

    $this->send_mess($redis,$frame->fd,$fd_to,$message,$event); 
  }
  //发送消息
  protected function send_mess($redis, $fd_from, $fd_to,  $message = '', $event = '')
  {
	  $user_from = $redis->hGetAll(self::USER_KEY . $fd_from);
	  if ($event == self::EVENT_SYSTEM)
	  {//系统消息
		  foreach ($this->connections as $fd)
		  {
			  //连接存在，但不一定握手成功
			  if (!$this->exist($fd))
				  continue;

			  $data = array(
				  'user_from' => $user_from['uname'],
				  'message' => $message,
				  'time' => date('H:i:s'),
				  'event' => $event
			  );
			  $this->push($fd, json_encode($data));
		  }
	  }elseif($event == self::EVENT_USER){//当前用户信息

		  $data = array(
			  'user_from' => $user_from['uname'],
			  'message' => $message,
			  'time' => date('H:i:s'),
			  'event' => $event
		  );
		  $this->push($fd_to, json_encode($data));

	  }elseif($event == self::EVENT_GROUP){//群组消息
	    
	      $group = $user_from['group'];
	      foreach($this->connections as $fd){
			 //连接存在，但不一定握手成功
			  if(!$this->exist($fd))
				  continue;
			  $user =  $redis->hGetAll(self::USER_KEY.$fd);
		      if(!empty($user) && $user['group'] == $group){
			      $data = array(
					      'uid_from' => $fd_from,
                          'uid_to' => $fd_to,
					      'user_from' => $user_from['uname'],
					      'avatar' => $user_from['avatar'],
					      'token' => $user_from['token'], 					   
					      'message' => $message,
					      'time' => date('H:i:s'),
					      'event' => $event
					   );
			      $this->push($fd,json_encode($data));

		      }
	      }

      }elseif($event == self::EVENT_MESSAGE){//个人消息
	      $user_to = $redis->hGetAll(self::USER_KEY.$fd_to);
	      if(!$user_to){
		      return ;
	      }

	      //连接存在，但不一定握手成功
	      if(!$this->exist($fd_to))
		      return ;

	      $data_to = array(
			  'uid_from' => $fd_from,
              'uid_to' => $fd_to,
			  'user_from' => $user_from['uname'],
			  'avatar' => $user_from['avatar'],
			  'token' => $user_from['token'],
			  'message' => $message,
			  'time' => date('H:i:s'),
			  'event' => $event
		  );
          //发给接收方
	      $this->push($fd_to,json_encode($data_to));


          $data_from = array(
              'uid_from' => $fd_from,
              'uid_to' => $fd_to,
              'user_from' => $user_from['uname'],
              'avatar' => $user_from['avatar'],
              'token' => $user_from['token'],
              'message' => $message,
              'time' => date('H:i:s'),
              'event' => $event
          );
          //发给发起方
          $this->push($fd_from,json_encode($data_from));
      }elseif($event == self::EVENT_ONLINE){//在线用户
	      $group = $user_from['group'];
	      foreach($this->connections as $fd){
		      //连接存在，但不一定握手成功
		      if(!$this->exist($fd))
			      continue;

		      $user =  $redis->hGetAll(self::USER_KEY.$fd);
		      if(!empty($user) && $user['group'] == $group){
			      $data = array(
					      'user_from' => $user_from['uname'],
					      'token' => $user_from['token'], 
					      'message' => $message,
					      'time' => date('H:i:s'),
					      'event' => $event
					   );
			      $this->push($fd,json_encode($data));
		      }
	      }
      }elseif($event == self::EVENT_CHANGE){//修改昵称
              $message = mb_substr(trim($message),0,10,'UTF-8');
	      $user_from =  $redis->hGetAll(self::USER_KEY.$fd_from);
	      if(!empty($user_from)){
		      $flag = $redis->hMset(self::USER_KEY.$fd_from,array('uname'=>$message));
		      if($flag){
		              echo $user_from['token'].'修改昵称为：'.$message ."\n";
                 	      //更新在线用户
			      $data_online = $this->getOnlineUserList($redis,$user_from['group']);
			      $this->send_mess($redis,$fd_from,$fd_from,$data_online,self::EVENT_ONLINE);

		      }
	      }
      }
  }
  //连接断开
  public function closing($redis,$fd){
    //用户信息
    $user =  $redis->hGetAll(self::USER_KEY.$fd);
   
     //更新在线用户
     $data_online = $this->getOnlineUserList($redis,$user['group'],$fd);
     $this->send_mess($redis,$fd,$fd,$data_online,self::EVENT_ONLINE);
      
     //主动关闭连接
    $this->close($fd);
    $redis->decr(self::USER_NUM_KEY);
    $res = $redis->del(self::USER_KEY.$fd);
    if(!$res)
       echo "Redis删除用户{$fd}失败\n";
     echo "客户端{$fd}已断开连接\n";
  }
  
  //获取在线用户
  protected function getOnlineUserList($redis = NULL, $group = '',$fd_close = 0){
	  $user_list = array(); 
	  $group = empty($group) ? self::USER_GROUP_DEFAULT : $group;
	  $i = 0; 
	  foreach($this->connections as $fd){
		  //连接存在，但不一定握手成功
		  if(!$this->exist($fd))
			  continue;
		  $user = $redis->hGetAll(self::USER_KEY.$fd);
		  if(!empty($user) && $user['group'] == $group){
			  if($fd_close && $fd_close == $fd){
				  continue;
			  }
              $user_list[$i]['uid'] = $fd;
			  $user_list[$i]['uname'] = $user['uname'];
			  $user_list[$i]['token'] = $user['token'];
			  $user_list[$i]['avatar'] = $user['avatar'];
			  $i++;
		  }
	  }
	  return $user_list;
  }

  //获取随机token
  protected function getToken($length = 4){
    $result = '1';
    $length = (int) $length; 
    if($length < 1){
        return $result;
     }
     $alnu = '0123456789';
     for($i = 0; $i < $length; $i++){
	     $mt = mt_rand(0,strlen($alnu)-1);     
	     $result .= $alnu[$mt];
     }
     return $result;
  }
}
