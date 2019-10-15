$(function() {
    chat.init();

    //键盘事件
    $(".container-main").on('keydown', '.chat-txt', function(ev) {
        var default_val = $(this).val();
        if (ev.keyCode == 13 && ev.ctrlKey) {
            $(this).val(default_val + "\n");
            return false;
        } else if (ev.keyCode == 13) {
            var index = chat.get_current_chat_index();
            chat.send_msg(index);
            return false;
        }
    }).on('focus', '.chat-txt', function(){
        chat.hide_faces();
    });

    //按钮事件
    $(".container-main").on('click', '.chat-submit', function() {
        var index = chat.get_current_chat_index();
        chat.send_msg(index);
    });

    //表情选择
    $(".container-main").on('click', '.face-select', function() {
        var index = chat.get_current_chat_index();

        chat.show_faces(index);
    });
    //表情点击事件
    $(".container-main").on('click', '.face-more li', function(){
        var face_val = 'face' + $(this).attr('title');
        var index = chat.get_current_chat_index();
        chat.append_face(face_val, index);
    });

    //聊天窗口
    $('.online').on('click', 'li', function() {
        var index = $(this).attr('data-id');

        //创建窗口
        chat.create_chat(index);
    });

});

var config = {//配置
    server :  'wss://chat.7keit.com:9502'
};
var faces = ["[微笑]", "[嘻嘻]", "[哈哈]", "[可爱]", "[可怜]", "[挖鼻]", "[吃惊]", "[害羞]", "[挤眼]", "[闭嘴]", "[鄙视]", "[爱你]", "[泪]", "[偷笑]", "[亲亲]", "[生病]", "[太开心]", "[白眼]", "[右哼哼]", "[左哼哼]", "[嘘]", "[衰]", "[委屈]", "[吐]", "[哈欠]", "[抱抱]", "[怒]", "[疑问]", "[馋嘴]", "[拜拜]", "[思考]", "[汗]", "[困]", "[睡]", "[钱]", "[失望]", "[酷]", "[色]", "[哼]", "[鼓掌]", "[晕]", "[悲伤]", "[抓狂]", "[黑线]", "[阴险]", "[怒骂]", "[互粉]", "[心]", "[伤心]", "[猪头]", "[熊猫]", "[兔子]", "[ok]", "[耶]", "[good]", "[NO]", "[赞]", "[来]", "[弱]", "[草泥马]", "[神马]", "[囧]", "[浮云]", "[给力]", "[围观]", "[威武]", "[奥特曼]", "[礼物]", "[钟]", "[话筒]", "[蜡烛]", "[蛋糕]"];
var chat = {
    object : {//属性
        socket : null,
        user : {},
        faces : []
    },
    init : function(){//初始化
        try{
            this.object.socket = new WebSocket(config.server);
        }catch(ex){
            this.layer_msg('请设置浏览器为极速模式或使用更高级的浏览器！');
        }

        this.open();
        this.close();
        this.message();
        this.error();
    },
    open : function() {//连接
        this.object.socket.onopen = function(evt) {
            chat.notice('准备开车了，请系好安全带！');
        }
    },
    close : function(){//关闭
        this.object.socket.onclose = function(evt) {
            chat.notice('已下车，欢迎下次乘坐！');
        }
    },
    error : function() {//错误
        this.object.socket.onerror = function(evt, e) {
            console.log('Error错误: ' + evt.data);
        };
    },
    send_msg : function(index) {//发送消息
        var to_uid = index;

        var chat_input = $(".section-chat[data-id="+ index +"] .chat-txt");
        var msg = chat_input.val();
        msg = $.trim(msg);
        if (msg == '') {
            this.layer_msg('请输入消息内容');
            return false;
        }
        //文本处理
        msg = msg.replace(/<(.+?)>/gi,"&lt;$1&gt;").replace(/ /gi,"&nbsp;").replace(/\n/gi,"<br/>");

        //更新消息列表
        var data = {
            uid : this.user.uid,
            to_uid : to_uid,
            token : this.user.token,
            avatar : this.user.avatar,
            user_from : this.user.uname,
            message : msg
        };

        //发送消息
        var data_send = JSON.stringify(data);
        this.object.socket.send(data_send);

        //隐藏更多表情
        this.hide_faces();

        //清空内容
        chat_input.val('');
    },
    message : function() {//接收消息
        this.object.socket.onmessage = function(evt) {
            var data = jQuery.parseJSON(evt.data);

            //根据不同的消息类型做处理
            switch (data.event){
                case 'system':
                    chat.notice(data.message);
                    break;
                case 'user':
                    chat.receive_user(data.message);
                    break;
                case 'message':
                    chat.receive_msg(data);
                    break;
                case 'group':
                    chat.receive_msg(data);
                    break;
                case 'online':
                    chat.receive_online(data.message);
                    break;
            }
        }
    },
    receive_user : function(data) {//更新用户信息
        this.user = data;
        $('.section-mine .avatar').attr('src', this.user.avatar);
        $('.section-mine .uname').text(this.user.uname);
    },
    receive_msg : function(data) {//接收到普通消息
        //接收窗口
        var index = data.event =='group' ? 0 : data.uid_to;

        var msg_style = 'msg';
        if(data.uid_from != this.user.uid){
            msg_style +=' msg-receive';
            if(data.event =='message') {
                index = data.uid_from;
            }
        }
        var html ='<li class="'+ msg_style +'"><div class="msg-object"><img class="avatar" src="'+ data.avatar +'">';
        html +='</div><div class="msg-content"><div class="msg-uname msg-uname-r">'+ data.user_from +'</div>';
        html +='<div class="msg-detail"><p>' + data.message + '</p></div><div class="clearfix"></div></div></li>';


        //创建窗口
        chat.create_chat(index);

        $('.section-chat[data-id='+ index +'] .chat-content>ul').append(html);

        this.scrollBottom();
    },
    receive_online : function(data) {//接收到用户上线提醒
        if(!data.length){
            return false;
        }
        var html = '<li data-token="0" data-id = "0" class="active"><img class="avatar" src="images/avatar/0.jpg"><span class="uname">群聊</span></li>';
        for(var i = 0;i < data.length; i++) {
            if(data[i].uid == this.user.uid){
                continue;
            }
            html +='<li data-token="' + data[i].token + '" data-id = "'+ data[i].uid +'"><img class="avatar" src="'+ data[i].avatar +'"><span class="uname">'+ data[i].uname +'</span></li>';
        }
        $('.online').html(html);
    },
    notice : function(msg){//系统提示
        var html ='<li class="notice"><p>'+ msg +'</p></li>';
        $('.container-main .section-chat[data-id=0] .chat-content>ul').append(html);

        this.scrollBottom();
    },
    scrollBottom : function() { //滚动消息
        var index = chat.get_current_chat_index();
        $('.container-main .section-chat[data-id='+ index +'] .chat-content>ul').scrollTop($('.container-main .section-chat[data-id='+ index +'] .chat-content>ul')[0].scrollHeight );
    },
    layer_msg : function(msg, time) {//错误弹窗
        var time_close = time || 0;
        layer.msg(msg, {time: time_close, icon:5});
    },
    get_faces : function() { //获取表情图标
       var html = '<ul>';

        for(var i=0;i<faces.length;i++){
            html += '<li title="'+ faces[i] +'"><img src="images/face/'+ i +'.gif"/></li>';
        }

        html += '</ul>';
        return html;
    },
    show_faces : function(index){//显示更多表情
        var obj_face = $('.container-main .section-chat[data-id='+ index +']').find('.face-more:first');

        if(obj_face.find('ul').length){
            obj_face.show();
            return false;
        }
        obj_face.html(chat.get_faces()).show();
    },
    hide_faces : function(){//隐藏更多表情
        var index = chat.get_current_chat_index();
        $('.container-main .section-chat[data-id='+ index +'] .face-more').hide();
    },
    append_face : function(face_val, index){//追加表情
        var chat_input = $('.container-main .section-chat[data-id='+ index +'] .chat-content .chat-input .chat-txt');
        var default_val = chat_input.val();
        chat_input.val(default_val + face_val);
    },
    create_chat : function(index){//新开聊天窗口
        if(!$('.container-main').find('.section-chat[data-id='+ index +']').length){
            var chat_section = '<div class="section-chat" data-id="'+ index +'">';
            chat_section += '<div class="chat-title">';
            chat_section += '<h4>群发消息</h4>';
            chat_section += '</div>';
            chat_section += '<div class="chat-content">';
            chat_section += '<ul></ul>';
            chat_section += '<div class="chat-input">';
            chat_section += ' <div class="face-more"></div>';
            chat_section += '<div class="tool">';
            chat_section += '<i class="iconfont face-select">&#xf00f5;</i>';
            chat_section += '</div>';
            chat_section += '<textarea class="chat-txt"></textarea>';
            chat_section += '</div>';
            chat_section += '<div class="chat-submit">';
            chat_section += '<button>发送消息（Enter）</button>';
            chat_section += '</div>';
            chat_section += '</div>';
            chat_section += '</div>';
            $('.container-main').append(chat_section);
        }

        //聚焦聊天人
        this.change_chat_title(index);
        //隐藏其他
        this.hide_chat(index);
    },
    change_chat_title : function(index){//修改聊天窗口样式
        $('.online li').removeClass('active');
        $('.online li[data-id='+ index +']').addClass('active');
    },
    hide_chat : function(index){//隐藏其他窗口
        var title_new = $('.online li[data-id='+ index +']').find('.uname:first').text();
        $('.container-main .section-chat[data-id='+ index +']').find('.chat-title h4').text(title_new);
        $('.container-main .section-chat').hide();
        $('.container-main .section-chat[data-id='+ index +']').show();
    },
    get_current_chat_index : function (){//获取当前操作的聊天窗口
        var index = 0;
        if($('.online').find('.active').length){
            index = $('.online .active').attr('data-id');
        }
        return index;
    }
};