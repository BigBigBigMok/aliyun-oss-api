# aliyun-oss-api
阿里云OSS 简化sdk
由于阿里云oss官方提供的web端sdk体积过大1.13mb（压缩后509kb），功能丰富安全可靠，但是项目需求简单，不想造成代码包体积收到影响，被逼无奈根据官方文档构建min版sdk，只具备上传及分片上传功能，代码包体积减小至6kb（压缩后3kb）。

源码地址：[aliyun-oss-api](https://github.com/BigBigBigMok/aliyun-oss-api)

阿里云OSS文档：[官方文档](https://help.aliyun.com/document_detail/64040.html)





    import OSS from 'aliyun-oss-api.js'

    let client = new OSS({
      region: ossConfig.region,
      accessKeyId: ossConfig.accessKeyId,
      accessKeySecret: ossConfig.accessKeySecret,
      bucket: ossConfig.bucketName,
      secure: true
    })

    client.put(uploadFile.path, file)


    client.multipartUpload(uploadFile.path, file, {
        progress: async function(p, checkpoint) {
          const e = {}
          e.percent = parseInt(p * 100)
          option.onProgress(e)
        },
        partSize: 5 * 1024 * 1024
    })



