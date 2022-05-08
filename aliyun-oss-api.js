/*
 * aliyun-oss-api
 * 
 * @Author: BigBigBigMok
 */


function Client(options) {
	if (!(this instanceof Client)) {
		return new Client(options);
	}

	if (options && options.inited) {
		this.options = options;
	} else {
		this.options = Client.initOptions(options);
	}
}

Client.initOptions = function initOptions(options) {
	if (!options || !options.accessKeyId || !options.accessKeySecret) {
		throw new Error('require accessKeyId, accessKeySecret');
	}
	if (!options.stsToken) {
		console.warn(
			'Please use STS Token for safety, see more details at https://help.aliyun.com/document_detail/32077.html'
		);
	}

	var opts = Object.assign({
		secure: isHttpsWebProtocol(),
		useFetch: false,
		region: 'oss-cn-hangzhou',
		internal: false,
		timeout: 60000,
		bucket: null,
		endpoint: null,
		cname: false,
		isRequestPay: false,
		sldEnable: false,
		headerEncoding: 'utf-8',
		refreshSTSToken: null,
		retryMax: 0,
		partSize: 5 * 1024 * 1024
	}, options);
	opts.accessKeyId = opts.accessKeyId.trim();
	opts.accessKeySecret = opts.accessKeySecret.trim();
	if (opts.endpoint) {
		opts.endpoint = setEndpoint(opts.endpoint, opts.secure);
	} else if (opts.region) {
		opts.endpoint = setRegion(options.bucket + '.' + opts.region, opts.internal, opts.secure);
	} else {
		throw new Error('require options.endpoint or options.region');
	}

	opts.inited = true;
	return opts;
};




var proto = Client.prototype;

/**
 * @description [put 单独上传整个文件]
 * @author   BigBigBigMok
 * @param    path [上传的路径] file [上传文件]
 * @return   {Promise}   [返回promise对象]
 */
proto.put = function(path, file) {
	return new Promise((resolve, reject) => {
		try {
			const url = this._getUrl(path)
			Ajax.put(url, file, () => {
				resolve({
					statusCode: 200,
					url: url
				})
			}, () => {
				reject()
			})
		} catch (e) {
			console.error('==oss.put==', e)
			reject(new Error(e))
		}
	})
};

// 分片上传
proto.multipartUpload = function(path, file, options) {
	return new Promise((resolve, reject) => {
		try {
			const url = this._getUrl(path)
			Ajax.post(url + '?uploads=', null, (res) => {
				this._partUpload(url, file, options, res).then(res => {
					resolve(res)
				})
			})	
		} catch (e) {
			console.error('==oss.multipartUpload===', e)
			reject(new Error(e))
		}
	})
}

// 分片部分上传
proto._partUpload = function(url, file, options, res) {
	try {
		return new Promise((resolve, reject) => {
			const partSize = this.options.partSize || 5 * 1024 * 1024
			const num = Math.ceil(file.size / partSize)
			const uploadId = this._getUploadId(res)
			let hasFinishPart = 0
			let log = []
			for (let i = 1; i <= num; i++) {
				Ajax.put(url + '?partNumber=' + i + '&uploadId=' + uploadId, file.slice(partSize * (i - 1),
					partSize * i), (res) => {
					options.progress(i / num)
					hasFinishPart++
					log[i - 1] = '<Part><PartNumber>' + i + '</PartNumber><ETag>' + res
						.getResponseHeader('ETag') + '</ETag></Part>'
					if (hasFinishPart >= num) {
						this._completeMultipartUpload(url, uploadId, log, file).then(res => {
							resolve({
								statusCode: 200,
								url: url
							})
						})
					}
				})
			}
		})
	} catch (e) {
		throw new Error('==oss._partUpload==', e)
	}
}

// 分片上传完成通知
proto._completeMultipartUpload = function(url, uploadId, log, file) {
	try {
		let a = '<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>' + log.join('') +
			'</CompleteMultipartUpload>'
		return new Promise((resolve, reject) => {
			Ajax.post(url + '?uploadId=' + uploadId, a, (res) => {
				resolve(res)
			})
		})
	} catch (e) {
		console.error('==completeMultipartUpload==', e)
	}
}

// 获取参数路径
proto._getUrl = function(path) {
	return this.options.endpoint + '/' + path
}

// 获取uploadId
proto._getUploadId = function(res) {
	const arr1 = res.split('<UploadId>')
	const arr2 = arr1[1].split('</UploadId>')
	return arr2[0]
}

// 是否为https
function isHttpsWebProtocol() {
	return location && location.protocol === 'https:';
}

// ajax请求
var Ajax = {
	post: function(url, data, success, fail) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', url);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 304) {
					if (success && typeof(success) === "function") {
						success(xhr.responseText);
					}
				} else {
					if (fail && typeof(fail) === "function") {
						fail('ajax:post 失败')
					}
				}
			}
		}
		xhr.send(data);
	},
	put: function(url, data, success, fail) {
		var xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 304) {
					if (success && typeof(success) === "function") {
						success(xhr);
					}
				} else {
					if (fail && typeof(fail) === "function") {
						fail('ajax:put 失败')
					}
				}
			}
		}
		xhr.send(data);
	}
}


function setEndpoint(endpoint, secure) {
	let url = endpoint;
	if (!url.protocol) {
		url = `http${secure ? 's' : ''}://${endpoint}`;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Endpoint protocol must be http or https.');
	}
	return url;
}

function setRegion(region, internal = false, secure = false) {
	const protocol = secure ? 'https://' : 'http://';
	let suffix = internal ? '-internal.aliyuncs.com' : '.aliyuncs.com';
	return protocol + region + suffix
}


module.exports = Client;
