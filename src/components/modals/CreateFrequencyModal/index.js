// @flow
import React, { Component } from 'react';
// $FlowFixMe
import { connect } from 'react-redux';
// $FlowFixMe
import Modal from 'react-modal';
// $FlowFixMe
import compose from 'recompose/compose';
// $FlowFixMe
import { withRouter } from 'react-router';
// $FlowFixMe
import slugg from 'slugg';
// $FlowFixMe
import { withApollo } from 'react-apollo';
import ModalContainer from '../modalContainer';
import { TextButton, Button } from '../../buttons';
import { modalStyles, Description } from '../styles';
import { closeModal } from '../../../actions/modals';
import { addToastWithTimeout } from '../../../actions/toasts';
import {
  CHECK_UNIQUE_FREQUENCY_SLUG_QUERY,
  createFrequencyMutation,
} from '../../../api/frequency';
import { Form, Actions } from './style';
import { throttle } from '../../../helpers/utils';
import {
  Input,
  UnderlineInput,
  TextArea,
  Checkbox,
  Error,
} from '../../formElements';

class CreateFrequencyModal extends Component {
  constructor() {
    super();

    this.state = {
      name: '',
      slug: '',
      description: '',
      isPrivate: false,
      slugTaken: false,
      slugError: false,
      descriptionError: false,
      nameError: false,
      createError: false,
      loading: false,
    };

    this.checkSlug = throttle(this.checkSlug, 500);
  }

  close = () => {
    this.props.dispatch(closeModal());
  };

  changeName = e => {
    const name = e.target.value;
    let lowercaseName = name.toLowerCase().trim();
    let slug = slugg(lowercaseName);

    if (name.length >= 20) {
      this.setState({
        nameError: true,
      });

      return;
    }

    this.setState({
      name,
      slug,
      nameError: false,
    });

    this.checkSlug(slug);
  };

  changeSlug = e => {
    let slug = e.target.value;
    let lowercaseSlug = slug.toLowerCase().trim();
    slug = slugg(lowercaseSlug);

    if (slug.length >= 24) {
      this.setState({
        slugError: true,
      });

      return;
    }

    this.setState({
      slug,
      slugError: false,
    });

    this.checkSlug(slug);
  };

  checkSlug = slug => {
    const community = this.props.modalProps.slug;
    // check the db to see if this frequency slug exists
    this.props.client
      .query({
        query: CHECK_UNIQUE_FREQUENCY_SLUG_QUERY,
        variables: {
          slug,
          community,
        },
      })
      .then(({ data }) => {
        // if the frequency exists
        if (!data.loading && data && data.frequency && data.frequency.id) {
          this.setState({
            slugTaken: true,
          });
        } else {
          this.setState({
            slugTaken: false,
          });
        }
      });
  };

  changeDescription = e => {
    const description = e.target.value;
    if (description.length >= 140) {
      this.setState({
        descriptionError: true,
      });
      return;
    }

    this.setState({
      description,
      descriptionError: false,
    });
  };

  changePrivate = e => {
    const value = e.target.checked;

    this.setState({
      isPrivate: value,
    });
  };

  create = e => {
    e.preventDefault();
    const {
      name,
      slug,
      description,
      isPrivate,
      slugTaken,
      slugError,
      nameError,
      descriptionError,
    } = this.state;
    const { modalProps: { id }, modalProps } = this.props;

    // if an error is present, ensure the client cant submit the form
    if (slugTaken || nameError || descriptionError || slugError) {
      this.setState({
        createError: true,
      });

      return;
    }

    // clientside checks have passed
    this.setState({
      createError: false,
      loading: true,
    });

    // create the mutation input
    const input = {
      community: id,
      name,
      slug,
      description,
      isPrivate,
    };

    this.props
      .createFrequency(input)
      .then(({ data: { createFrequency } }) => {
        this.props.history.push(`/${modalProps.slug}/${createFrequency.slug}`);
        this.close();
        this.props.dispatch(
          addToastWithTimeout('success', 'Frequency successfully created!')
        );
      })
      .catch(err => {
        this.setState({
          loading: false,
        });

        this.props.dispatch(addToastWithTimeout('error', err.toString()));
      });
  };

  render() {
    const { isOpen, modalProps } = this.props;
    const {
      name,
      slug,
      description,
      isPrivate,
      slugTaken,
      slugError,
      nameError,
      descriptionError,
      createError,
      loading,
    } = this.state;
    const styles = modalStyles();

    return (
      <Modal
        isOpen={isOpen}
        contentLabel={'Create a Frequency'}
        onRequestClose={this.close}
        shouldCloseOnOverlayClick={true}
        style={styles}
        closeTimeoutMS={330}
      >
        {/*
          We pass the closeModal dispatch into the container to attach
          the action to the 'close' icon in the top right corner of all modals
        */}
        <ModalContainer title={'Create a Frequency'} closeModal={this.close}>
          <Form>
            <Input
              id="name"
              defaultValue={name}
              onChange={this.changeName}
              autoFocus={true}
            >
              Frequency Name
            </Input>

            {nameError &&
              <Error>Frequency names can be up to 20 characters long.</Error>}

            <UnderlineInput defaultValue={slug} onChange={this.changeSlug}>
              {`sp.chat/${modalProps.slug}/`}
            </UnderlineInput>

            {slugTaken &&
              <Error>
                This url is already taken - feel free to change it if
                you're set on the name {name}!
              </Error>}

            {slugError &&
              <Error>
                Slugs can be up to 24 characters long.
              </Error>}

            <TextArea
              id="slug"
              defaultValue={description}
              onChange={this.changeDescription}
            >
              Describe it in 140 characters or less
            </TextArea>

            {descriptionError &&
              <Error>
                Oop, that's more than 140 characters - try trimming that up.
              </Error>}

            <Checkbox
              id="isPrivate"
              checked={isPrivate}
              onChange={this.changePrivate}
            >
              Private channel
            </Checkbox>
            {isPrivate
              ? <Description>
                  Only approved people on Spectrum can see the stories, messages, and members in this channel. You can manually approve users who request to join this channel.
                </Description>
              : <Description>
                  Anyone on Spectrum can join this channel, post stories and messages, and will be able to see other members.
                </Description>}

            <Actions>
              <TextButton color={'warn.alt'}>Cancel</TextButton>
              <Button
                disabled={!name || !slug || slugTaken || !description}
                loading={loading}
                onClick={this.create}
              >
                Save
              </Button>
            </Actions>

            {createError &&
              <Error>
                Please fix any errors above before creating this community.
              </Error>}
          </Form>
        </ModalContainer>
      </Modal>
    );
  }
}

const CreateFrequencyModalWithMutation = compose(
  createFrequencyMutation,
  withRouter
)(CreateFrequencyModal);

const mapStateToProps = state => ({
  isOpen: state.modals.isOpen,
  modalProps: state.modals.modalProps,
});

const CreateFrequencyModalWithState = connect(mapStateToProps)(
  CreateFrequencyModalWithMutation
);
const CreateFrequencyModalWithQuery = withApollo(CreateFrequencyModalWithState);
export default CreateFrequencyModalWithQuery;