var SMB2Forge = require('../tools/smb2-forge');
var SMB2Request = SMB2Forge.request;

/*
 * readdir
 * =======
 *
 * list the file / directory from the path provided:
 *
 *  - open the directory
 *
 *  - query directory content
 *
 *  - close the directory
 *
 */
module.exports = function readdir(path, cb) {
  var connection = this;

  function queryDirectory(files, fileEntries, file, connection, cb) {
    SMB2Request('query_directory', file, connection, function(err, entries) {
      if (err) {
        if(err.code === 'STATUS_NO_MORE_FILES') {
          cb(null, files, fileEntries);
        } else {
          cb(err);
        }
      
      } else {
        for (const entry of entries) {
          const filename = entry.Filename;

          if (filename === '.' || filename === '..') {
            continue;
          }

          files.push(filename);
          
          fileEntries.push({
            filename,
            AllocationSize: entry.AllocationSize,
            FileAttributes: entry.FileAttributes,
            ChangeTime: entry.ChangeTime,
            CreationTime: entry.CreationTime,
          });
        }

        queryDirectory(files, fileEntries, file, connection, cb);
      } 
    });  
  }

  function openDirectory(path, connection, cb) {
    SMB2Request('open', { path: path }, connection, function(err, file) {
      if (err) {
        cb(err);
      } else {
        return cb(null, file);
      }
    });
  }

  function closeDirectory(file, connection, cb) {
    // SMB2 query directory  
    SMB2Request('close', file, connection, function(err, res) {
      if (err) {
        if(err.code !== 'STATUS_FILE_CLOSED') {
          cb(err);
        }
      }
      // SMB2 close directory
      cb(null, res);    
    });
  }


  openDirectory(path, connection, function(err, file) {
    var totalFiles = [];
    var files = [];
    var fileEntries = [];

    if (err) {
      cb(err);
    } else {
      queryDirectory(files, fileEntries, file, connection, function(err, file) {
        if (err) {
          cb(err);
        } else {
          closeDirectory(file, connection, function(err, file) {
            if (err) {
              cb(err);
            } else {
              cb(null, files, fileEntries);
            }              
          });
        }          
      })
    }
  });
};
