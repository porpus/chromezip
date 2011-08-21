var CENTRAL_DIRECTORY_KEY = [6,5,75,80];
var CENTRAL_DIRECTORY_FILE_KEY = [2,1,75,80];
var LOCAL_FILE_KEY = [4,3,75,80];
var DATA_KEY = [8,7,75,80];

var unzip = function(){
    upload(processData);
    
    return false;
};

var upload = function(callback) {
    var zip = document.getElementById("zip");
    // the file is the first element in the files property
    var file = zip.files[0];
    if(file)
    {
        var reader = new FileReader();
        var x = 100000;
        reader.onload = function(evt){
            console.log("Uploading complete");
            callback(evt.target.result);
        };
        
        reader.readAsBinaryString(file);
    }
};

var download = function(fileList) {
    var totalSize = 0;
    for(var x = 0; x < fileList.length; x++)
    {
        totalSize += fileList[x].uncompressedSize;
    }
    
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.requestFileSystem(window.PERSISTENT, totalSize, function(fileSystem){
        for(x = 0; x < fileList.length; x++)
        {
            buildFile(fileSystem, fileList[x]);
        }
    }, function(){console.log("FileSystem Failed");});
};

var buildFile = function(fileSystem, file)
{
    if(file.data)
    {
        if(file.name.indexOf('/') == -1)
        {
            createFile(fileSystem.root, file, file.name);
        }
        else
        {
            var fullPath = file.name.split('/');
            while(fullPath[0] === '.' || fullPath[0] === '') {
                if(fullPath.length > 1)
                    fullPath = fullPath.slice(1);
                else
                    break;
            }
            
            if(fullPath.length == 1)
            {
                createFile(fileSystem.root, file, file.name);
            }
            else
            {
                createDir(fileSystem.root, fullPath, file);
            }
        }
    }
};

var createDir = function(baseDir, fullPath, file){
    
    baseDir.getDirectory(fullPath[0], {create: true}, function(dirEntry) {
        
        // Recursively add the new subfolder (if we still have another to create).
        if (fullPath.length > 2) {
            createDir(dirEntry, fullPath.slice(1), file);
        }
        else
        {
            createFile(dirEntry, file, fullPath[1]);
        }
    }, function(e){console.log("Directory Creation Failed: " + fullPath[0] + ":" + e.code);});
};

var createFile = function(directory, file, fileName){
    directory.getFile(fileName, {create: true}, function(fileEntry) {
                
        fileEntry.createWriter(function(fileWriter) {
            
            fileWriter.onwriteend = function(e) {
                var ul = document.getElementById("downloads");
                var a = document.createElement('a');
                a.innerText = file.name;
                a.setAttribute('target', '_blank');
                a.setAttribute('href', fileEntry.toURL());
                
                var li = document.createElement('li');
                li.appendChild(a);
                ul.appendChild(li);
            };
            
            fileWriter.onerror = function(e) {
                console.log('Write failed: ' + e.toString());
            };
            
            var bb = new WebKitBlobBuilder(); 
            bb.append(file.data);
            if(file.name.indexOf(".gif") != -1)
                console.log(file.data);
            fileWriter.write(bb.getBlob('text/plain'));
    
        }, function(){console.log("Writer Failed");});
    
    }, function(e){console.log("File Creation Failed: " + file.name + " error: " + e.code);});
};

var processData = function(data){
    console.log("File Length: " + data.length);
    
    var x = data.length - 22;
    while(x >= 0)
    {
        var key = toHex(data.substring(x, x + 4), true);
        if(equals(key, CENTRAL_DIRECTORY_KEY))
        {
            break;
        }
        
        x--;
    }
    
    if(x >= 0)
    {
        var records = toHex(data.substring(x + 8, x + 10), true);
        var totalRecords = toHex(data.substring(x + 10, x + 12), true);
        if(equals(records, totalRecords))
        {
            var centralDirectoryStart = hexToNumber(toHex(data.substring(x + 16, x + 20), true));
            var recordCount = hexToNumber(records);
            
            console.log("records: " + recordCount);
            console.log("Central Directory start: " + centralDirectoryStart);
            
            var fileList = buildFileList(data, centralDirectoryStart, recordCount);
            console.log(fileList[0]);
            
            decompressFiles(data, fileList);
            
            download(fileList);
        }
        else
        {
            console.log("only single zip files supported for now");
        }
    }
    else
    {
        console.log("No Central directory found...not a zip file?...*shrug*");
    }
};

var buildFileList = function(data, centralDirectoryStart, records){
    var fileList = [];
    var x = centralDirectoryStart;
    for(var y = 0; y < records; y++)
    {
        if(equals(toHex(data.substring(x, x + 4), true), CENTRAL_DIRECTORY_FILE_KEY))
        {
            var file = {};
            file.version = hexToNumber(toHex(data.substring(x + 4, x + 6), true));
            file.versionNeeded = hexToNumber(toHex(data.substring(x + 6, x + 8), true));
            file.compression = hexToNumber(toHex(data.substring(x + 10, x + 12), true));
            file.crc = hexToNumber(toHex(data.substring(x + 16, x + 20), true));
            file.compressedSize = hexToNumber(toHex(data.substring(x + 20, x + 24), true));
            file.uncompressedSize = hexToNumber(toHex(data.substring(x + 24, x + 28), true));
            file.offset = hexToNumber(toHex(data.substring(x + 42, x + 46), true));
            
            var fileNameLength = hexToNumber(toHex(data.substring(x + 28, x + 30), true));
            var extraLength = hexToNumber(toHex(data.substring(x + 30, x + 32), true));
            var commentLength = hexToNumber(toHex(data.substring(x + 32, x + 34), true));
            
            file.nameLength = fileNameLength;
            file.extraLength = extraLength;
            file.name = data.substring(x + 46, x + 46 + fileNameLength);
            fileList[y] = file;
            
            x += 46 + fileNameLength + extraLength + commentLength;
        }
        else
        {
            console.log("Lost track of the files...sorry");
            break;
        }
    }
    
    return fileList;
};

var decompressFiles = function(data, fileList){
    for(var x = 0; x < fileList.length; x++)
    {
        var file = fileList[x];
        
        if(file.compression == 8)
        {
            var dataStart = file.offset + 30 + file.nameLength + file.extraLength;
            file.data = RawDeflate.inflate(data.substring(dataStart, dataStart + file.compressedSize));
        }
        else if(file.compression === 0)
        {
            if(file.compressedSize > 0)
            {
                var dataStart = file.offset + 30 + file.nameLength + file.extraLength;
                //file.data = RawDeflate.inflate(data.substring(dataStart, dataStart + file.compressedSize));
                file.data = data.substring(dataStart, dataStart + file.compressedSize);
                if(file.name.indexOf(".gif") != -1)
                {
                    console.log(file);
                }
            }
        }
        else if(file.compression !== 0)
        {
            console.log("compression type not supported: " + file.compression);
        }
    }
};