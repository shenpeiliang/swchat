# swchat
基于swoole+php简单聊天应用程序

# 环境搭建

阿里云添加安全组：

tcp:9502


服务器添加端口：

```
firewall-cmd --permanent --add-port=9502/tcp
```

php需要安装指定扩展，使用ssl

dockerfile参考

```
RUN docker-php-ext-install sockets \
        && docker-php-ext-enable sockets

RUN docker-php-ext-install pdo_mysql \
	&& docker-php-ext-enable pdo_mysql
	
RUN pecl install redis-4.0.1 \
	&& docker-php-ext-enable redis
	
RUN apt-get install -y libssl-dev openssl

RUN curl -fsSL 'http://pecl.php.net/get/swoole-4.2.9.tgz' -o swoole-4.2.9.tgz \
    && tar -zxf swoole-4.2.9.tgz \
    && rm -rf swoole-4.2.9.tgz \
    && cd swoole-4.2.9 \
    && /usr/local/bin/phpize \
    && ./configure --enable-openssl --enable-sockets --enable-async-redis --enable-mysqlnd --enable-coroutine \
    && make -j$(nproc) \
    && make install \
    && rm -rf swoole-4.2.9 \
    && docker-php-ext-enable swoole
```


启动服务器

```
php ws_server.php  >>/dev/null &
```

# 效果图

![image](https://github.com/shenpeiliang/swchat/blob/master/images/效果图.png）
