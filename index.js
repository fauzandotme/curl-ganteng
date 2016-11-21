const exec = require('child_process').exec;
const querystring = require('querystring');
const fs = require('fs');

module.exports = {curl, array_clean, str_clean, save_log, append};

function curl(link, options) {
  if(!options) options = {};
  if(typeof link == 'string') options.url = link;
  else options = link;
  let url = options.url;
  let useragent = (options.useragent) ? `-A ${options.useragent}` : `-A 'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36' `;
  let headers = (options.headers) ? obj_to_headers(options.headers) : '';
  let head_only = (options.head_only) ? '-I ' : '';
  let include = (options.include) ? '-i ' : '';
  let cookie = (options.cookie) ? `-H 'Cookie: ${options.cookie}' ` : '';
  let location = (options.redirect) ? '-L ' : '';
  let command = `curl ${useragent+head_only+include+headers+cookie+location+url}`;
  return new Promise((resolve, reject) => {
    exec(command,{maxBuffer: 1024 * 5000}, (err, res) => {
      if(err) reject(err);
      let output = parse_res(res, options.cookie, url);
      resolve(output);
    })
  });
}

function parse_res(res, cookie_obj, req_url) {
  let location = res.match(/Location:\ +.+/g);
  if(location) req_url = location[location.length - 1].replace('Location: ', '');
  res = res.split('\r\n\r\n');
  let headers, body = [];
  res.forEach((item) => {
    if(/HTTP/.test(item.substring(0,4))) headers = item;
    else body.push(item);
  });
  body = str_clean(array_clean(body).join('\n'));


  let headers_obj = headers_to_object(headers);
  if(cookie_obj) {
    cookie_obj = append(cookie_to_object(cookie_obj), cookie_to_object(get_cookie(headers_obj)))
  } else cookie_obj = cookie_to_object(get_cookie(headers_obj));
  let cookie = obj_to_cookie(cookie_obj);
  return {headers, headers_obj, cookie, cookie_obj, body, req_url};
}

curl({url: 'http://google.com', include: true, head_only: true, redirect: true, cookie: 'NID=test;  ganteng=test;    '})
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  })

function obj_to_headers(headers) {
  let output = '';
  for (var key in headers) {
    if (headers.hasOwnProperty(key)) {
      output += `-H '${key.uppercase_first_letter()}: ${headers[key]} '`;
    }
  }
  return output;
}

String.prototype.uppercase_first_letter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function get_cookie(headers) {
  let cookie = (headers['Set-Cookie']) ? headers['Set-Cookie'] : '';
  if(cookie) return cookie;
  else return '';
}

function cookie_to_object(str) {
  str = str.split(';');
  let output = {};
  str.forEach((item) => {
    let index = item.indexOf('=');
    let key = item.substr(0, index).trim();
    let value = item.substr(index+1).trim();
    if(key) output[key] = value;
  })
  return output;
}

function obj_to_cookie(cookie) {
  let output = '';
  for (var key in cookie) {
    if (cookie.hasOwnProperty(key)) {
      output += `${key}=${cookie[key]}; `;
    }
  }
  return output;
}

function headers_to_object(str) {
  str = str.split('\r\n');
  str = str.splice(1, str.length);
  let output = {};
  str.forEach((item) => {
    let index = item.indexOf(': ');
    let key = item.substr(0,index);
    let value = item.substr(index+2);
    output[key] = value;
  })
  return output;
}

function append(obj, new_obj) {
  let output = {};
  for (let key in new_obj) {
    if (new_obj.hasOwnProperty(key)) {
      if(Array.isArray(new_obj[key])) {
        append(obj[key] , new_obj[key])
      } else if(typeof new_obj[key] == 'object') {
        if(obj[key]) {
          append(obj[key], new_obj[key]);
        } else {
          obj[key] = {};
          append(obj[key], new_obj[key]);
        }
      } else {
        obj[key] = new_obj[key];
      }
    }
  }
  return obj;
}

function save_log(data, file_name) {
  if(typeof data === 'object') data = JSON.stringify(data);
  fs.writeFileSync(`./${file_name}`, data);
}

function array_clean(arr) {
  output = [];
  arr.forEach((item, index) => {
    if(item) output.push(item);
  });
  return output;
}

function str_clean(str) {
  return str.replace(/\s\s+/g, '');
}
