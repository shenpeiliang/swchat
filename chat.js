$(function(){

var is_connected = false;
var wsServer = 'ws://47.93.204.210:9502';
var websocket = new WebSocket(wsServer);
websocket.addEventListener('open', function (evt) {
    console.log("成功连接到服务器");
    is_connected = true;
});

websocket.addEventListener('close', function (evt) {
    is_connected = false;
    do_message('连接已经断开，请刷新重试',1);
});

websocket.addEventListener('message', function (evt) {
    var data = JSON.parse(evt.data);
    do_message(data,1);
});

websocket.addEventListener('error', function (evt, e) {
    do_message('错误信息ERROR: ' + evt.data,1);
});

//修改昵称
function disp_prompt(d_name){
	var name = prompt("请输入您想要的昵称",d_name);
	if(name == "" || name == undefined || name == null ){
		return ;
	}
	var res = {'event':'4','message':name};
	websocket.send(JSON.stringify(res));
}

$('#user-change').click(function(){
  disp_prompt();
});


$('body').load(disp_prompt());
/**
 * 返回当前时间 如 10:46:14
 * @returns {String} 字符串
 */
function get_time() {
    var date = new Date(), h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();
    if (h < 10) {
        h = '0' + h;
    }
    if (m < 10) {
        m = '0' + m;
    }
    if (s < 10) {
        s = '0' + s;
    }
    return h + ':' + m + ':' + s;
}

//单独私聊
$('#online-user').on('click','li',function(){
  var obj =  $(this).find('a:first')
  obj.addClass('active-send');
  $(this).siblings().find('a:first').removeClass('active-send');
  $('#sms-title').html(obj.attr('title'));
});

function do_message(data,from){
  var str = '';
  if(data.event == 1 || data.event ==2){//普通消息
	  var sms_type = from ? 'from_server' : 'user_send';
	  var str = '<dt class="message_header '+ sms_type +'">'+ (data.time ? data.time : get_time()) +'<span>'+ (data.user_from ? data.user_from + data.token : '')  +'</span></dt>';
	  
          str = str + '<dd class="'+ sms_type +'"><p>'+ data.message  +'</p></dd>'; 
	  $('#sms-container').append(str);
          $('#sms-container').scrollTop($('#sms-container').prop('scrollHeight'));
  }else if(data.event == 3){//在线用户
	  str += '<li><a href="javascript:;" title="群聊" data-id="" data-token="" data-title="">群聊</a></li>';
          for(var i=0;i<data.message.length;i++){
		str += '<li><a href="javascript:;" class="online-user-d" title="'+  data.message[i].uname + data.message[i].token  +'"  data-token="' + data.message[i].token + '" data-id = "'+ data.message[i].id +'" data-title="'+data.message[i].uname +'">'+ data.message[i].uname + data.message[i].token + '</a></li>';
	  }
	  $('#online-user').html(str);  
  }else{//系统消息

  } 
}
//当前发送
function do_message_l(data,from){
	var str = '';
	var sms_type = from ? 'from_server' : 'user_send';
	var str = '<dt class="message_header '+ sms_type +'">'+ (data.time ? data.time : get_time()) +'<span>'+ (data.user_from ? data.user_from + data.token : '')  +'</span></dt>';
 
	var info = data.message;
	if(data.event == 2){
                var msg = JSON.parse(info);
		info = msg.message;
	}

	str = str + '<dd class="'+ sms_type +'"><p>'+ info  +'</p></dd>'; 
	$('#sms-container').append(str);
	$('#sms-container').scrollTop($('#sms-container').prop('scrollHeight'));
} 
  $(document).keydown(function(e){
     if(e.keyCode == 13){
        $('#form-send').trigger('click');
     }
  });
  $('#form-send').click(function(){
    var obj =  $('#content');
    var message = obj.val();
    if(message.length){
      if(!is_connected){
        alert('连接已经断开，请重试');
        return false;
      }
      var event = 1;

      var id = 0;
      var token = '';
      var title = '';


      var obj_user = $('#online-user .active-send');
      if(obj_user.length){
        id = obj_user.attr('data-id');
	token = obj_user.attr('data-token');
	title = obj_user.attr('data-title');
	if(id.length > 0 && token.length > 0 && title.length > 0){
		event = 2;
		var json_str = {'id':id,'token':token,'title':title,'message':message};
		message = JSON.stringify(json_str);
	}
      }
      var res = {'event':event,'message':message};

      websocket.send(JSON.stringify(res));
      do_message_l(res);
      obj.val('');
    }
  });

}); 
