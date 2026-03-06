# 多机实现在VLAN状态下的SSH远程连接访问

- **系统**：Linux(Ubuntu20.04+)、Windows 11

> VLAN：虚拟局域网，是一种将多个物理局域网连接在一起的方式，从而实现多个网络之间的数据传输。

- [] 开启SSH服务
- [] 注册、安装、配置ZeroTier
- [] 授权与连接ZeroTier
- **本文目标**：通过本文，你可以实现主机在异地、多从机、多VLAN下使用ssh远程连接访问多个从机。

---

## 目录

[[toc]]

---
## 1. 开启SSH服务
> SSH服务: Secure Shell，是一种加密的远程登录协议，常用于安全地管理服务器、传输文件和执行远程命令。它通过 对称加密 + 非对称加密 保护数据传输安全，并支持多种身份验证方式。

### windows端开启SSH服务
由于Windows11默认启用了SSH服务，所以不需要手动开启。

### Linux端开启SSH服务
- 安装 OpenSSH Server
```bash
sudo apt update
sudo apt install openssh-server openssh-clients -y
```
- ssh服务的启动与管理
```bash
systemctl start sshd # 启动
systemctl stop sshd # 停止
systemctl restart sshd # 重启
systemctl enable sshd # 开机自启
systemctl status sshd # 查看状态
```
- 确认ssh服务启动成功
 ```bash
    sudo systemctl status ssh
```
应显示 `active (running)`。
- 配置防火墙（如果开启了 ufw）：
 ```bash
    sudo ufw allow ssh
```
需要允许ssh服务访问。

## 2. 注册、安装、配置ZeroTier
> ZeroTier 是一个开源的 VPN 服务器，它可以将多个物理网络连接在一起，从而实现多台计算机之间的数据传输。ZeroTier 的核心是 ZeroTier 网络，它是一个虚拟的局域网，它可以将多个物理网络连接在一起，从而实现多台计算机之间的数据传输。ZeroTier 的网络由多个节点组成，每个节点都运行 ZeroTier 节点软件，并连接到 ZeroTier 网络。
### 注册与安装
- [ZeroTier官网](https://www.zerotier.com/)注册ZertTier账号，然后登录[ZeroTier控制台](https://central.zerotier.com/)点击 **Network** -> **Members** -> 添加新的Network

- windows端安装：[ZeroTier](https://www.zerotier.com/download/)
- Linux端安装：
```bash
curl -s https://install.zerotier.com | sudo bash
```
- 打开[ZeroTier控制台](https://central.zerotier.com/)获取一个 16 位的 **Network ID**。
### 配置ZeroTier
- windows端配置：打开ZeroTier客户端，然后直接输入**Network ID**。
- linux端配置：
::: warning 提示
当Linux端配置ZeroTier的时候，请关闭网络代理！！！
:::
```bash
sudo zerotier-cli join <Network ID>
```
**如果看到 `200 join OK`，说明请求成功。**
配置成功后，可以通过以下命令查看当前网络信息：
```bash
sudo zerotier-cli info
```
## 3. 授权与连接ZeroTier
- 打开[ZeroTier控制台](https://central.zerotier.com/),Network -> **Members Devices** -> 可以发现**Status**显示尚未认证 -> 在**Action**处进行激活 -> **Status**显示`Authorized` 即可。
- 此时只需要记住所需要连接的ZT IP地址，就可以通过SSH远程连接了。
```bash
ssh user@user-ZT-IP
```
如果主机不小心关闭了从机控制终端或者需要长时间跑代码等需要保持登录连接状态场景，可以使用tmux实现，此处给出[tmux使用教程](https://www.ruanyifeng.com/blog/2019/10/tmux.html)。
- tmux常用命令：
```bash
tmux new -t session_name # 创建一个名为session_name的会话
tmux attach -t session_name # 激活名为session_name的会话
tmux kill-session -t session_name # 删除名为session_name的会话
```
