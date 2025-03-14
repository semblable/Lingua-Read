import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/store';

const Home = () => {
  const { token } = useAuthStore();

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">Welcome to LinguaRead</h1>
          <p className="lead mb-5">
            Improve your language skills by reading texts and tracking your vocabulary progress.
            LinguaRead helps you learn new words in context and remember them better.
          </p>
          
          {token ? (
            <Row className="justify-content-center">
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>My Texts</Card.Title>
                    <Card.Text>
                      View your saved texts and continue learning where you left off.
                    </Card.Text>
                    <Button as={Link} to="/texts" variant="primary">Go to My Texts</Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Add New Text</Card.Title>
                    <Card.Text>
                      Import a new text in your target language to start learning new vocabulary.
                    </Card.Text>
                    <Button as={Link} to="/texts/create" variant="success">Add Text</Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            <Row className="justify-content-center">
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Get Started</Card.Title>
                    <Card.Text>
                      Create an account to start tracking your language learning progress.
                    </Card.Text>
                    <Button as={Link} to="/register" variant="primary">Register</Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Already a User?</Card.Title>
                    <Card.Text>
                      Log in to access your saved texts and continue learning.
                    </Card.Text>
                    <Button as={Link} to="/login" variant="outline-primary">Login</Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
          
          <Row className="mt-5">
            <Col>
              <h2 className="mb-4">How It Works</h2>
              <Row className="text-start">
                <Col md={4} className="mb-4">
                  <h4>1. Add Texts</h4>
                  <p>Import texts in your target language that interest you.</p>
                </Col>
                <Col md={4} className="mb-4">
                  <h4>2. Mark Words</h4>
                  <p>Highlight words you're learning and track your progress.</p>
                </Col>
                <Col md={4} className="mb-4">
                  <h4>3. Review & Learn</h4>
                  <p>See your vocabulary growth over time as you read more texts.</p>
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Home; 