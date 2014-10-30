#!/bin/bash
#
# Dumps mongolab databases for platform and Quantified Dev as tars on AWS S3

#Configuration for oneself
ONESELF_MONGOLAB_URL=""
ONESELF_DB_NAME=""
ONESELF_DB_BACKUP_PATH="`pwd`"
ONESELF_DB_USERNAME=""
ONESELF_DB_PASSWORD="" 

#Configuration for quantified dev
QD_MONGOLAB_URL=""
QD_DB_NAME=""
QD_DB_BACKUP_PATH="`pwd`"
QD_DB_USERNAME=""
QD_DB_PASSWORD=""

#Configuration for aws s3
S3_BUCKET=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

#####################################################################################
#  Script
#####################################################################################
TODAYS_DATE=`date | cut -f3 -d' '`-`date | cut -f2 -d' '`-`date | cut -f6 -d' '`

readConfigDetails(){
#oneSelf
echo -e "\n############################ Platform db Config ############################\n"
echo -n "Enter mongolab url for platform database and press [ENTER]: "
read ONESELF_MONGOLAB_URL

echo -n "Enter db name for platform database and press [ENTER]: "
read ONESELF_DB_NAME

echo -n "Enter username for platform database and press [ENTER]: "
read ONESELF_DB_USERNAME

read_platform_password

#quantifieddev
echo -e "\n############################ Quantified Dev db Config ############################\n"
echo -n "Enter mongolab url for Quantified Dev database and press [ENTER]: "
read QD_MONGOLAB_URL

echo -n "Enter db name for Quantified Dev database and press [ENTER]: "
read QD_DB_NAME

echo -n "Enter username for Quantified Dev database and press [ENTER]: "
read QD_DB_USERNAME

read_quantified_dev_password

#aws s3 details
echo -e "\n############################ AWS S3 Config ############################\n"
echo -n "Enter AWS S3 bucket name and press [ENTER]: "
read S3_BUCKET

echo -n "Enter AWS S3 access key and press [ENTER]: "
read S3_ACCESS_KEY_ID

echo -n "Enter AWS S3 secret access key and press [ENTER]: "
read S3_SECRET_ACCESS_KEY
}

read_platform_password(){
unset ONESELF_DB_PASSWORD
	prompt="Enter password for platform database and press [ENTER]: "
	while IFS= read -p "$prompt" -r -s -n 1 char
	do
	    if [[ $char == $'\0' ]]
	    then
	        break
	    fi
	    prompt='*'
	    ONESELF_DB_PASSWORD+="$char"
	done
	echo
	echo "Done. Password=$ONESELF_DB_PASSWORD"
}

read_quantified_dev_password(){
unset QD_DB_PASSWORD
	prompt="Enter password for Quantified Dev database and press [ENTER]: "
	while IFS= read -p "$prompt" -r -s -n 1 char
	do
	    if [[ $char == $'\0' ]]
	    then
	        break
	    fi
	    prompt='*'
	    QD_DB_PASSWORD+="$char"
	done
	echo
	echo "Done. Password=$QD_DB_PASSWORD"
}

#Runs mongodump on the given db and stores bson files at given temperory location
export_db_to_temp_location(){
	MONGOLAB_URL=$1
	DB_NAME=$2
	DB_USERNAME=$3
	DB_PASSWORD=$4
	TMP_BACKUP_DIR=$5
	MONGODUMP_BIN_PATH="$(which mongodump)"

	echo -e "\n----exporting $DB_NAME to $TMP_BACKUP_DIR"

	set -o xtrace
	$MONGODUMP_BIN_PATH -h $MONGOLAB_URL -d $DB_NAME -u $DB_USERNAME -p $DB_PASSWORD -o $TMP_BACKUP_DIR	
	set +o xtrace
}

#Creates a tar file with the gicen name, with the contents of the temporary directory where dump was exported
create_tar_file(){
	BACKUP_FILENAME=$1
	TMP_BACKUP_DIR=$2

	echo -e "\n----creating a tar file $BACKUP_FILENAME with contents of $TMP_BACKUP_DIR"

	TAR_BIN_PATH="$(which tar)"		
	$TAR_BIN_PATH --remove-files -cvzf $BACKUP_FILENAME -C $TMP_BACKUP_DIR .
}

#Upload a given file to 'mongolabsbackup' s3 bucket
upload_to_s3(){
	echo -e "\n----uploading tar file to s3 bucket"
	FILE_TO_UPLOAD=$1
	RESOURCE="/${S3_BUCKET}/${FILE_TO_UPLOAD}"
	CONTENT_TYPE="application/x-compressed-tar"
	DATE_VALUE=`date -R`
	STRING_TO_SIGN_IN="PUT\n\n${CONTENT_TYPE}\n${DATE_VALUE}\n${RESOURCE}"
	SIGNATURE=`echo -en ${STRING_TO_SIGN_IN} | openssl sha1 -hmac ${S3_SECRET_ACCESS_KEY} -binary | base64`
	curl -X PUT -T "${FILE_TO_UPLOAD}" \
		-H "Host: ${S3_BUCKET}.s3.amazonaws.com" \
		-H "Date: ${DATE_VALUE}" \
		-H "Content-Type: ${CONTENT_TYPE}" \
		-H "Authorization: AWS ${S3_ACCESS_KEY_ID}:${SIGNATURE}" \
		https://${S3_BUCKET}.s3.amazonaws.com/${FILE_TO_UPLOAD}

	echo -e "\n----File $FILE_TO_UPLOAD uploded successfully!!\n" 
}


########################################################################################################################
#
# Starting Backup 
#
########################################################################################################################

#Read Configuration details
###########################

readConfigDetails

#Back up 1Self
################

echo -e "\n##################### Starting backup for 1Self db ###########################\n"

#Directory created after exporting data from database
ONESELF_TMP_BACKUP_DIR="$ONESELF_DB_NAME-tempdump-"$TODAYS_DATE

cd $ONESELF_DB_BACKUP_PATH
mkdir $ONESELF_TMP_BACKUP_DIR

#export db to temp location
export_db_to_temp_location $ONESELF_MONGOLAB_URL $ONESELF_DB_NAME $ONESELF_DB_USERNAME $ONESELF_DB_PASSWORD $ONESELF_DB_BACKUP_PATH/$ONESELF_TMP_BACKUP_DIR

#Create a tar file
ONESELF_BACKUP_TAR_FILENAME="$ONESELF_DB_NAME-mongodump-"$TODAYS_DATE.tar.gz
create_tar_file $ONESELF_BACKUP_TAR_FILENAME $ONESELF_DB_BACKUP_PATH/$ONESELF_TMP_BACKUP_DIR

#Upload tar file to S3
upload_to_s3 $ONESELF_BACKUP_TAR_FILENAME

#Delete the tar file from tmp location
rm -rf $ONESELF_BACKUP_TAR_FILENAME

#Backup quantifieddev
################################################

echo -e "\n##################### Starting backup for quantifieddev db ###########################\n"

#Directory created after exporting data from database
QD_TMP_BACKUP_DIR="$QD_DB_NAME-tempdump-"$TODAYS_DATE

cd $QD_DB_BACKUP_PATH
mkdir $QD_TMP_BACKUP_DIR

#export db to temp location
export_db_to_temp_location $QD_MONGOLAB_URL $QD_DB_NAME $QD_DB_USERNAME $QD_DB_PASSWORD $QD_DB_BACKUP_PATH/$QD_TMP_BACKUP_DIR

#Create a tar file
QD_BACKUP_TAR_FILENAME="$QD_DB_NAME-mongodump-"$TODAYS_DATE.tar.gz
create_tar_file $QD_BACKUP_TAR_FILENAME $QD_DB_BACKUP_PATH/$QD_TMP_BACKUP_DIR

#Upload tar file to S3
upload_to_s3 $QD_BACKUP_TAR_FILENAME

#Delete the tar file from tmp location
rm -rf $QD_BACKUP_TAR_FILENAME